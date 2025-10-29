import prisma from '../prisma.js';
import { ApiError } from '../utils/apiError.js';
import { buildPagination, buildMeta } from '../utils/pagination.js';

const getLoanPeriodDays = (category) => category?.loan_period_days ?? 14;

const getMaxCheckoutCount = (category) => category?.max_checkout_count ?? 5;

const getSystemPreference = async (tx, variable, fallback) => {
  const pref = await tx.systemPreference.findUnique({ where: { variable } });
  if (!pref || pref.value === null) return fallback;
  return pref.value;
};

const getItemByIdentifier = async (tx, { itemnumber, barcode }) => {
  if (itemnumber) {
    return tx.item.findUnique({ where: { itemnumber } });
  }
  if (barcode) {
    return tx.item.findUnique({ where: { barcode } });
  }
  return null;
};

export const checkoutItem = async ({ borrowernumber, itemnumber, barcode }, actor) => {
  if (actor && actor.role !== 'ADMIN' && actor.id !== borrowernumber) {
    throw new ApiError(403, 'Members can only checkout items for themselves');
  }

  return prisma.$transaction(async (tx) => {
    const borrower = await tx.borrower.findUnique({
      where: { borrowernumber },
      include: { category: true }
    });
    if (!borrower) {
      throw new ApiError(404, 'Borrower not found');
    }

    if (borrower.debarred && borrower.debarred >= new Date()) {
      throw new ApiError(403, `Borrower is debarred until ${borrower.debarred.toISOString().slice(0, 10)}`);
    }

    if (borrower.dateexpiry && borrower.dateexpiry < new Date()) {
      throw new ApiError(403, 'Membership expired');
    }

    const item = await getItemByIdentifier(tx, { itemnumber, barcode });
    if (!item) {
      throw new ApiError(404, 'Item not found');
    }

    if (item.notforloan) {
      throw new ApiError(403, 'Item is marked as not for loan');
    }

    if (item.status !== 'available') {
      throw new ApiError(409, `Item is currently ${item.status}`);
    }

    const conflictingReserve = await tx.reserve.findFirst({
      where: {
        itemnumber: item.itemnumber,
        borrowernumber: { not: borrowernumber },
        cancellationdate: null,
        found: null
      }
    });
    if (conflictingReserve) {
      throw new ApiError(403, 'Item is reserved for another patron');
    }

    const currentCheckouts = await tx.issue.count({ where: { borrowernumber, returndate: null } });
    if (currentCheckouts >= getMaxCheckoutCount(borrower.category)) {
      throw new ApiError(403, 'Borrower reached maximum checkout limit');
    }

    const loanPeriod = getLoanPeriodDays(borrower.category);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanPeriod);

    const existingIssue = await tx.issue.findUnique({ where: { itemnumber: item.itemnumber } });

    let issue;
    if (existingIssue && !existingIssue.returndate) {
      throw new ApiError(409, 'Item already checked out');
    }

    if (existingIssue && existingIssue.returndate) {
      issue = await tx.issue.update({
        where: { issue_id: existingIssue.issue_id },
        data: {
          borrowernumber,
          issuedate: new Date(),
          date_due: dueDate,
          returndate: null,
          renewals_count: 0,
          lastreneweddate: null
        },
        include: {
          borrower: {
            select: { borrowernumber: true, full_name: true, email: true }
          },
          item: {
            select: { itemnumber: true, barcode: true, biblionumber: true }
          }
        }
      });
    } else {
      issue = await tx.issue.create({
        data: {
          borrowernumber,
          itemnumber: item.itemnumber,
          date_due: dueDate
        },
        include: {
          borrower: {
            select: { borrowernumber: true, full_name: true, email: true }
          },
          item: {
            select: { itemnumber: true, barcode: true, biblionumber: true }
          }
        }
      });
    }

    await tx.item.update({
      where: { itemnumber: item.itemnumber },
      data: {
        status: 'checked_out',
        onloan: dueDate,
        issues: { increment: 1 },
        updated_at: new Date()
      }
    });

    await tx.reserve.updateMany({
      where: {
        itemnumber: item.itemnumber,
        borrowernumber,
        cancellationdate: null,
        found: null
      },
      data: {
        found: 'P',
        waitingdate: new Date()
      }
    });

    return issue;
  });
};

export const listCirculationHistory = async ({
  page = 1,
  limit = 20,
  issuedFrom,
  issuedTo,
  returnedFrom,
  returnedTo
}) => {
  const { skip } = buildPagination({ page, limit });

  const issuedFilter = {};
  if (issuedFrom) issuedFilter.gte = new Date(issuedFrom);
  if (issuedTo) issuedFilter.lte = new Date(issuedTo);

  const returnFilter = {};
  if (returnedFrom) returnFilter.gte = new Date(returnedFrom);
  if (returnedTo) returnFilter.lte = new Date(returnedTo);

  const where = {};
  if (Object.keys(issuedFilter).length) where.issuedate = issuedFilter;
  if (Object.keys(returnFilter).length) where.returndate = returnFilter;

  const [total, issues] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { issuedate: 'desc' },
      include: {
        borrower: {
          select: { borrowernumber: true, full_name: true }
        },
        item: {
          select: { itemnumber: true, barcode: true }
        }
      }
    })
  ]);

  return {
    data: issues,
    meta: buildMeta({ total, page: Number(page), limit: Number(limit) })
  };
};

export const returnItem = async ({ issueId, itemnumber, barcode }, actor) => {
  return prisma.$transaction(async (tx) => {
    const issue = await tx.issue.findFirst({
      where: {
        AND: [
          issueId ? { issue_id: issueId } : undefined,
          itemnumber ? { itemnumber } : undefined,
          barcode ? { item: { barcode } } : undefined,
          { returndate: null }
        ].filter(Boolean)
      },
      include: {
        item: true,
        borrower: { include: { category: true } }
      }
    });

    if (!issue) {
      throw new ApiError(404, 'Active issue not found');
    }

    if (actor && actor.role !== 'ADMIN' && issue.borrowernumber !== actor.id) {
      throw new ApiError(403, 'Members can only return their own items');
    }

    const now = new Date();

    const updatedIssue = await tx.issue.update({
      where: { issue_id: issue.issue_id },
      data: {
        returndate: now
      }
    });

    await tx.item.update({
      where: { itemnumber: issue.itemnumber },
      data: {
        status: 'available',
        onloan: null,
        datelastborrowed: now,
        datelastseen: now,
        updated_at: now
      }
    });

    const overdueMs = now - issue.date_due;
    if (overdueMs > 0) {
      const daysOverdue = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));
      if (daysOverdue > 0) {
        const finePerDayRaw = await getSystemPreference(tx, 'fine_per_day', '0.25');
        const finePerDay = Number(finePerDayRaw);
        const fineAmount = Number((daysOverdue * finePerDay).toFixed(2));

        if (fineAmount > 0) {
          await tx.accountLine.create({
            data: {
              borrowernumber: issue.borrowernumber,
              itemnumber: issue.itemnumber,
              issue_id: issue.issue_id,
              amount: fineAmount,
              amountoutstanding: fineAmount,
              description: `Overdue fine - ${daysOverdue} days late`,
              accounttype: 'OVERDUE',
              status: 'open'
            }
          });
        }
      }
    }

    const nextReserve = await tx.reserve.findFirst({
      where: {
        biblionumber: issue.item.biblionumber,
        cancellationdate: null,
        found: null
      },
      orderBy: [
        { priority: 'asc' },
        { reservedate: 'asc' }
      ]
    });

    if (nextReserve) {
      await tx.reserve.update({
        where: { reserve_id: nextReserve.reserve_id },
        data: {
          found: 'W',
          waitingdate: new Date()
        }
      });
    }

    return updatedIssue;
  });
};

export const renewItem = async ({ issueId }, actor) => {
  return prisma.$transaction(async (tx) => {
    const issue = await tx.issue.findUnique({
      where: { issue_id: issueId },
      include: {
        borrower: { include: { category: true } },
        item: true
      }
    });

    if (!issue) {
      throw new ApiError(404, 'Issue not found');
    }

    if (actor && actor.role !== 'ADMIN' && issue.borrowernumber !== actor.id) {
      throw new ApiError(403, 'Members can only renew their own items');
    }

    if (issue.returndate) {
      throw new ApiError(400, 'Cannot renew a returned item');
    }

    const maxRenewalsRaw = await getSystemPreference(tx, 'max_renewals', '3');
    const maxRenewals = Number(maxRenewalsRaw);

    if (issue.renewals_count >= maxRenewals) {
      throw new ApiError(403, `Maximum renewal limit (${maxRenewals}) reached`);
    }

    const conflictingReserve = await tx.reserve.findFirst({
      where: {
        itemnumber: issue.itemnumber,
        borrowernumber: { not: issue.borrowernumber },
        cancellationdate: null,
        found: null
      }
    });
    if (conflictingReserve) {
      throw new ApiError(403, 'Item is reserved for another patron');
    }

    const loanPeriod = getLoanPeriodDays(issue.borrower.category);
    const newDue = new Date(issue.date_due);
    newDue.setDate(newDue.getDate() + loanPeriod);

    const renewedIssue = await tx.issue.update({
      where: { issue_id: issue.issue_id },
      data: {
        date_due: newDue,
        lastreneweddate: new Date(),
        renewals_count: { increment: 1 }
      }
    });

    await tx.item.update({
      where: { itemnumber: issue.itemnumber },
      data: {
        renewals: { increment: 1 },
        onloan: newDue,
        updated_at: new Date()
      }
    });

    return renewedIssue;
  });
};
