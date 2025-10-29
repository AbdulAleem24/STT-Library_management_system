import prisma from '../prisma.js';
import { ApiError } from '../utils/apiError.js';
import { buildPagination, buildMeta } from '../utils/pagination.js';

export const listItems = async ({ page = 1, limit = 20, status, search }) => {
  const { skip } = buildPagination({ page, limit });

  const where = {
    AND: [
      status ? { status } : undefined,
      search
        ? {
            OR: [
              { barcode: { contains: search, mode: 'insensitive' } },
              { itemcallnumber: { contains: search, mode: 'insensitive' } }
            ]
          }
        : undefined
    ].filter(Boolean)
  };

  if (!where.AND.length) delete where.AND;

  const [total, items] = await Promise.all([
    prisma.item.count({ where: where.AND ? where : undefined }),
    prisma.item.findMany({
      where: where.AND ? where : undefined,
      skip,
      take: Number(limit),
      include: {
        biblio: true
      },
      orderBy: { created_at: 'desc' }
    })
  ]);

  return {
    data: items,
    meta: buildMeta({ total, page: Number(page), limit: Number(limit) })
  };
};

export const getItem = async (id) => {
  const item = await prisma.item.findUnique({
    where: { itemnumber: id },
    include: {
      biblio: true,
      issuesRecords: true
    }
  });

  if (!item) {
    throw new ApiError(404, 'Item not found');
  }

  return item;
};

export const createItem = async (payload) => {
  const biblio = await prisma.biblio.findUnique({ where: { biblionumber: payload.biblionumber } });
  if (!biblio) {
    throw new ApiError(404, 'Associated bibliographic record not found');
  }

  return prisma.item.create({
    data: {
      biblionumber: payload.biblionumber,
      barcode: payload.barcode,
      itemcallnumber: payload.itemcallnumber,
      location: payload.location,
      price: payload.price,
      replacementprice: payload.replacementprice,
      status: payload.status,
      notforloan: payload.notforloan ?? false
    }
  });
};

export const updateItem = async (id, payload) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.item.findUnique({
        where: { itemnumber: id },
        include: {
          biblio: {
            include: {
              itemType: true
            }
          }
        }
      });

      if (!existing) {
        throw new ApiError(404, 'Item not found');
      }

      const data = { updated_at: new Date() };
      if (payload.status !== undefined) data.status = payload.status;
      if (payload.notforloan !== undefined) data.notforloan = payload.notforloan;
      if (payload.location !== undefined) data.location = payload.location;
      if (payload.notes !== undefined) data.notes = payload.notes;

      const updated = await tx.item.update({
        where: { itemnumber: id },
        data
      });

      const statusChanged = payload.status && payload.status !== existing.status;
      const needsCharge = statusChanged && ['lost', 'damaged'].includes(payload.status);

      if (needsCharge) {
        const activeIssue = await tx.issue.findFirst({
          where: { itemnumber: id, returndate: null }
        });

        if (activeIssue) {
          const replacementPrice = Number(
            existing.replacementprice ?? existing.biblio?.itemType?.defaultreplacecost ?? 25
          );
          const multiplier = payload.status === 'lost' ? 1 : 0.5;
          const amount = Number((replacementPrice * multiplier).toFixed(2));
          const accountType = payload.status === 'lost' ? 'LOST' : 'DAMAGED';
          const description =
            payload.status === 'lost'
              ? `Replacement fee for lost item ${existing.barcode}`
              : `Damage fee for item ${existing.barcode}`;

          if (amount > 0) {
            const existingCharge = await tx.accountLine.findFirst({
              where: {
                issue_id: activeIssue.issue_id,
                accounttype: accountType
              }
            });

            if (!existingCharge) {
              await tx.accountLine.create({
                data: {
                  borrowernumber: activeIssue.borrowernumber,
                  itemnumber: id,
                  issue_id: activeIssue.issue_id,
                  amount,
                  amountoutstanding: amount,
                  description,
                  accounttype: accountType,
                  status: 'open'
                }
              });
            }
          }

          if (payload.status === 'lost') {
            await tx.issue.update({
              where: { issue_id: activeIssue.issue_id },
              data: { returndate: new Date() }
            });
          }
        }
      }

      return updated;
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new ApiError(404, 'Item not found');
    }
    throw error;
  }
};

export const deleteItem = async (id) => {
  try {
    await prisma.item.delete({ where: { itemnumber: id } });
    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new ApiError(404, 'Item not found');
    }
    throw error;
  }
};
