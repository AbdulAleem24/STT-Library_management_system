export const buildPagination = ({ page = 1, limit = 20 }) => {
  const safePage = Number.isNaN(Number(page)) || Number(page) < 1 ? 1 : Number(page);
  const safeLimit = Number.isNaN(Number(limit)) || Number(limit) < 1 ? 20 : Math.min(Number(limit), 100);
  const skip = (safePage - 1) * safeLimit;

  return { page: safePage, limit: safeLimit, skip };
};

export const buildMeta = ({ total, page, limit }) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    total,
    page,
    limit,
    totalPages
  };
};
