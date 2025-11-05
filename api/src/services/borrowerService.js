import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { ApiError } from '../utils/apiError.js';
import { config } from '../config/env.js';
import { buildPagination, buildMeta } from '../utils/pagination.js';

const sanitize = ({ password, staff_notes, ...rest }) => rest;

export const listBorrowers = async ({ page = 1, limit = 20, search, sort = 'created_at:desc' }) => {
  const { skip } = buildPagination({ page, limit });

  const where = search
    ? {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { cardnumber: { contains: search, mode: 'insensitive' } }
        ]
      }
    : undefined;

  const allowedSortFields = new Set(['created_at', 'full_name', 'email', 'cardnumber']);
  const [rawField = 'created_at', rawDirection = 'desc'] = sort.split(':');
  const field = allowedSortFields.has(rawField) ? rawField : 'created_at';
  const direction = rawDirection?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [total, borrowers] = await Promise.all([
    prisma.borrower.count({ where }),
    prisma.borrower.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [field]: direction },
      include: { category: true }
    })
  ]);

  return {
    data: borrowers.map(sanitize),
    meta: buildMeta({ total, page: Number(page), limit: Number(limit) })
  };
};

export const getBorrower = async (id) => {
  const borrower = await prisma.borrower.findUnique({
    where: { borrowernumber: id },
    include: { category: true }
  });

  if (!borrower) {
    throw new ApiError(404, 'Borrower not found');
  }

  return sanitize(borrower);
};

export const createBorrower = async ({
  cardnumber,
  fullName,
  email,
  password,
  categorycode,
  role = 'MEMBER'
}) => {
  const existing = await prisma.borrower.findUnique({ where: { cardnumber } });
  if (existing) {
    throw new ApiError(409, 'Card number already exists');
  }
  if (email) {
    const emailExists = await prisma.borrower.findUnique({ where: { email } });
    if (emailExists) {
      throw new ApiError(409, 'Email already registered');
    }
  }

  const category = await prisma.category.findUnique({ where: { categorycode } });
  if (!category) {
    throw new ApiError(422, `Category ${categorycode} not found`);
  }

  const hashed = await bcrypt.hash(password, config.bcryptSaltRounds);

  const borrower = await prisma.borrower.create({
    data: {
      cardnumber,
      full_name: fullName,
      email,
      password: hashed,
      categorycode,
      role
    },
    include: { category: true }
  });

  return sanitize(borrower);
};

export const updateBorrower = async (id, payload) => {
  const borrower = await prisma.borrower.findUnique({ where: { borrowernumber: id } });
  if (!borrower) {
    throw new ApiError(404, 'Borrower not found');
  }

  if (payload.email && payload.email !== borrower.email) {
    const emailExists = await prisma.borrower.findUnique({ where: { email: payload.email } });
    if (emailExists && emailExists.borrowernumber !== id) {
      throw new ApiError(409, 'Email already registered');
    }
  }

  if (payload.cardnumber && payload.cardnumber !== borrower.cardnumber) {
    const cardExists = await prisma.borrower.findUnique({ where: { cardnumber: payload.cardnumber } });
    if (cardExists && cardExists.borrowernumber !== id) {
      throw new ApiError(409, 'Card number already exists');
    }
  }

  const data = {};
  if (payload.fullName) data.full_name = payload.fullName;
  if (payload.preferredName !== undefined) data.preferred_name = payload.preferredName;
  if (payload.email) data.email = payload.email;
  if (payload.phone !== undefined) data.phone = payload.phone;
  if (payload.address !== undefined) data.address = payload.address;
  if (payload.dateexpiry) data.dateexpiry = payload.dateexpiry;
  if (payload.debarred) data.debarred = payload.debarred;
  if (payload.role) data.role = payload.role;
  if (payload.cardnumber) data.cardnumber = payload.cardnumber;
  if (payload.password) {
    data.password = await bcrypt.hash(payload.password, config.bcryptSaltRounds);
  }

  const updated = await prisma.borrower.update({
    where: { borrowernumber: id },
    data,
    include: { category: true }
  });

  return sanitize(updated);
};

export const deleteBorrower = async (id) => {
  const borrower = await prisma.borrower.findUnique({ where: { borrowernumber: id } });
  if (!borrower) {
    throw new ApiError(404, 'Borrower not found');
  }

  const activeIssue = await prisma.issue.findFirst({ where: { borrowernumber: id, returndate: null } });
  if (activeIssue) {
    throw new ApiError(409, 'Borrower has active checkouts');
  }

  const activeReserve = await prisma.reserve.findFirst({
    where: {
      borrowernumber: id,
      cancellationdate: null,
      found: null
    }
  });
  if (activeReserve) {
    throw new ApiError(409, 'Borrower has active holds');
  }

  await prisma.borrower.delete({ where: { borrowernumber: id } });
  return true;
};
