import prisma from '../prisma.js';
import { ApiError } from '../utils/apiError.js';
import { buildPagination, buildMeta } from '../utils/pagination.js';

export const listBiblios = async ({ page = 1, limit = 20, search, itemtype }) => {
  const { skip } = buildPagination({ page, limit });

  const where = {
    AND: [
      search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { author: { contains: search, mode: 'insensitive' } },
              { isbn: { contains: search, mode: 'insensitive' } }
            ]
          }
        : undefined,
      itemtype ? { itemtype } : undefined
    ].filter(Boolean)
  };

  if (!where.AND.length) delete where.AND;

  const [total, biblios] = await Promise.all([
    prisma.biblio.count({ where: where.AND ? where : undefined }),
    prisma.biblio.findMany({
      where: where.AND ? where : undefined,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' }
    })
  ]);

  return {
    data: biblios,
    meta: buildMeta({ total, page: Number(page), limit: Number(limit) })
  };
};

export const getBiblio = async (id) => {
  const biblio = await prisma.biblio.findUnique({
    where: { biblionumber: id },
    include: { items: true }
  });

  if (!biblio) {
    throw new ApiError(404, 'Bibliographic record not found');
  }

  return biblio;
};

export const createBiblio = async (payload) => {
  const data = {
    title: payload.title,
    subtitle: payload.subtitle,
    author: payload.author,
    isbn: payload.isbn,
    publisher: payload.publisher,
    publicationyear: payload.publicationyear,
    itemtype: payload.itemtype,
    notes: payload.notes,
    abstract: payload.abstract
  };

  return prisma.biblio.create({ data });
};

export const updateBiblio = async (id, payload) => {
  try {
    const data = {
      title: payload.title,
      subtitle: payload.subtitle,
      author: payload.author,
      isbn: payload.isbn,
      publisher: payload.publisher,
      publicationyear: payload.publicationyear,
      itemtype: payload.itemtype,
      notes: payload.notes,
      abstract: payload.abstract,
      updated_at: new Date()
    };

    return await prisma.biblio.update({
      where: { biblionumber: id },
      data
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new ApiError(404, 'Bibliographic record not found');
    }
    throw error;
  }
};

export const deleteBiblio = async (id) => {
  try {
    await prisma.biblio.delete({ where: { biblionumber: id } });
    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new ApiError(404, 'Bibliographic record not found');
    }
    throw error;
  }
};
