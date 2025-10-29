import prisma from '../prisma.js';
import { ApiError } from '../utils/apiError.js';
import { buildPagination, buildMeta } from '../utils/pagination.js';

export const listReserves = async ({ page = 1, limit = 20, borrower }) => {
  const { skip } = buildPagination({ page, limit });

  const where = borrower ? { borrowernumber: borrower } : undefined;

  const [total, reserves] = await Promise.all([
    prisma.reserve.count({ where }),
    prisma.reserve.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { reservedate: 'desc' },
      include: {
        borrower: { select: { borrowernumber: true, full_name: true } },
        biblio: { select: { biblionumber: true, title: true } },
        item: { select: { itemnumber: true, barcode: true } }
      }
    })
  ]);

  return {
    data: reserves,
    meta: buildMeta({ total, page: Number(page), limit: Number(limit) })
  };
};

export const createReserve = async ({ borrowernumber, biblionumber, itemnumber }, actor) => {
  if (actor && actor.role !== 'ADMIN' && actor.id !== borrowernumber) {
    throw new ApiError(403, 'Members can only place holds for themselves');
  }

  return prisma.$transaction(async (tx) => {
    const borrower = await tx.borrower.findUnique({ where: { borrowernumber } });
    if (!borrower) {
      throw new ApiError(404, 'Borrower not found');
    }

    const biblio = await tx.biblio.findUnique({ where: { biblionumber } });
    if (!biblio) {
      throw new ApiError(404, 'Bibliographic record not found');
    }

    if (itemnumber) {
      const item = await tx.item.findUnique({ where: { itemnumber } });
      if (!item) {
        throw new ApiError(404, 'Item not found');
      }
    }

    const existing = await tx.reserve.findFirst({
      where: {
        borrowernumber,
        OR: [
          { biblionumber, itemnumber: null },
          itemnumber ? { itemnumber } : undefined
        ].filter(Boolean),
        cancellationdate: null,
        found: null
      }
    });

    if (existing) {
      throw new ApiError(409, 'Borrower already has an active hold for this title');
    }

    const priorityAgg = await tx.reserve.aggregate({
      where: {
        biblionumber,
        cancellationdate: null
      },
      _max: { priority: true }
    });

    const nextPriority = (priorityAgg._max.priority ?? 0) + 1;

    return tx.reserve.create({
      data: {
        borrowernumber,
        biblionumber,
        itemnumber,
        priority: nextPriority
      }
    });
  });
};

export const cancelReserve = async (reserveId, actor) => {
  const reserve = await prisma.reserve.findUnique({ where: { reserve_id: reserveId } });

  if (!reserve) {
    throw new ApiError(404, 'Reserve not found');
  }

  if (actor && actor.role !== 'ADMIN' && reserve.borrowernumber !== actor.id) {
    throw new ApiError(403, 'Members can only cancel their own holds');
  }

  return prisma.reserve.update({
    where: { reserve_id: reserveId },
    data: {
      cancellationdate: new Date(),
      notes: reserve.notes ? `${reserve.notes}\nCancelled via API` : 'Cancelled via API'
    }
  });
};
