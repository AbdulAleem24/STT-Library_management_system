import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { ApiError } from '../utils/apiError.js';
import { config } from '../config/env.js';

const sanitizeBorrower = (borrower) => {
  if (!borrower) return null;
  const { password, staff_notes, ...safe } = borrower;
  return safe;
};

export const registerUser = async ({
  cardnumber,
  fullName,
  email,
  password,
  categorycode = 'ADULT',
  role = 'MEMBER'
}) => {
  const existingCard = await prisma.borrower.findUnique({ where: { cardnumber } });
  if (existingCard) {
    throw new ApiError(409, 'Card number already exists');
  }

  if (email) {
    const existingEmail = await prisma.borrower.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ApiError(409, 'Email already registered');
    }
  }

  const category = await prisma.category.findUnique({ where: { categorycode } });
  if (!category) {
    throw new ApiError(422, `Category ${categorycode} does not exist.`);
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
    }
  });

  return sanitizeBorrower(borrower);
};

export const loginUser = async ({ email, cardnumber, password }) => {
  const borrower = await prisma.borrower.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        cardnumber ? { cardnumber } : undefined
      ].filter(Boolean)
    }
  });

  if (!borrower) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const valid = await bcrypt.compare(password, borrower.password);
  if (!valid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  await prisma.borrower.update({
    where: { borrowernumber: borrower.borrowernumber },
    data: { lastseen: new Date() }
  });

  return sanitizeBorrower(borrower);
};

export const getProfile = async (borrowernumber) => {
  const borrower = await prisma.borrower.findUnique({
    where: { borrowernumber },
    include: {
      category: true
    }
  });

  if (!borrower) {
    throw new ApiError(404, 'User not found');
  }

  return sanitizeBorrower(borrower);
};
