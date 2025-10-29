import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../src/prisma.js';
import { config } from '../../src/config/env.js';
import { generateToken } from '../../src/utils/token.js';

const uniqueSuffix = () => crypto.randomBytes(4).toString('hex');

export const resetDatabase = async () => {
  await prisma.accountLine.deleteMany();
  await prisma.reserve.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.item.deleteMany();
  await prisma.biblio.deleteMany();
  await prisma.borrower.deleteMany();
  await prisma.category.deleteMany();
  await prisma.itemType.deleteMany();
  await prisma.systemPreference.deleteMany();
};

export const seedBaseData = async () => {
  await prisma.category.createMany({
    data: [
      {
        categorycode: 'ADULT',
        description: 'Adult Member',
        category_type: 'A',
        max_checkout_count: 5,
        loan_period_days: 14
      },
      {
        categorycode: 'CHILD',
        description: 'Child Member',
        category_type: 'C',
        max_checkout_count: 3,
        loan_period_days: 7
      },
      {
        categorycode: 'STAFF',
        description: 'Library Staff',
        category_type: 'S',
        max_checkout_count: 20,
        loan_period_days: 30
      }
    ],
    skipDuplicates: true
  });

  await prisma.itemType.createMany({
    data: [
      { itemtype: 'BOOK', description: 'Book', rentalcharge: 0, defaultreplacecost: 25 },
      { itemtype: 'EBOOK', description: 'Electronic Book', rentalcharge: 0, defaultreplacecost: 0 },
      { itemtype: 'DVD', description: 'DVD', rentalcharge: 2, defaultreplacecost: 20 },
      { itemtype: 'MAGAZINE', description: 'Magazine', rentalcharge: 0, defaultreplacecost: 5 },
      { itemtype: 'AUDIO', description: 'Audio Book', rentalcharge: 1, defaultreplacecost: 15 }
    ],
    skipDuplicates: true
  });

  await prisma.systemPreference.createMany({
    data: [
      {
        variable: 'version',
        value: '2.0.0',
        explanation: 'Database schema version (streamlined)',
        type: 'Free'
      },
      {
        variable: 'max_fine_allowed',
        value: '5.00',
        explanation: 'Maximum fine amount before checkouts are blocked',
        type: 'Currency'
      },
      {
        variable: 'fine_per_day',
        value: '0.25',
        explanation: 'Fine amount per day for overdue items',
        type: 'Currency'
      },
      {
        variable: 'max_renewals',
        value: '3',
        explanation: 'Maximum number of renewals allowed per item',
        type: 'Integer'
      },
      {
        variable: 'hold_expiry_days',
        value: '7',
        explanation: 'Number of days before canceling waiting hold',
        type: 'Integer'
      }
    ],
    skipDuplicates: true
  });
};

export const createBorrower = async ({
  cardnumber = `CARD-${uniqueSuffix()}`,
  fullName = 'Test User',
  email = `user-${uniqueSuffix()}@example.com`,
  password = 'Password123!',
  categorycode = 'ADULT',
  role = 'MEMBER',
  ...overrides
} = {}) => {
  const hashed = await bcrypt.hash(password, config.bcryptSaltRounds);
  return prisma.borrower.create({
    data: {
      cardnumber,
      full_name: fullName,
      email,
      password: hashed,
      categorycode,
      role,
      ...overrides
    }
  });
};

export const createBorrowerWithToken = async (options = {}) => {
  const borrower = await createBorrower(options);
  return {
    borrower,
    token: generateToken({ id: borrower.borrowernumber, role: borrower.role })
  };
};

export const createAdminWithToken = async (options = {}) => {
  const suffix = uniqueSuffix();
  return createBorrowerWithToken({
    cardnumber: options.cardnumber ?? `ADMIN-${suffix}`,
    fullName: options.fullName ?? 'Test Admin',
    email: options.email ?? `admin-${suffix}@example.com`,
    password: options.password ?? 'AdminPass123!',
    categorycode: options.categorycode ?? 'STAFF',
    role: 'ADMIN',
    ...options
  });
};

export const createMemberWithToken = async (options = {}) => {
  const suffix = uniqueSuffix();
  return createBorrowerWithToken({
    cardnumber: options.cardnumber ?? `MEMBER-${suffix}`,
    fullName: options.fullName ?? 'Test Member',
    email: options.email ?? `member-${suffix}@example.com`,
    password: options.password ?? 'MemberPass123!',
    categorycode: options.categorycode ?? 'ADULT',
    role: 'MEMBER',
    ...options
  });
};

export const createBiblioRecord = async ({
  title = `Book ${uniqueSuffix()}`,
  author = 'Author One',
  isbn = `9780000${uniqueSuffix()}`,
  itemtype = 'BOOK',
  publicationyear = 2020,
  ...overrides
} = {}) => {
  return prisma.biblio.create({
    data: {
      title,
      author,
      isbn,
      itemtype,
      publicationyear,
      ...overrides
    }
  });
};

export const createItemRecord = async ({
  biblionumber,
  barcode = `BC${uniqueSuffix()}`,
  status = 'available',
  location = 'Main Branch',
  notforloan = false,
  ...overrides
} = {}) => {
  if (!biblionumber) {
    throw new Error('biblionumber is required to create an item');
  }

  return prisma.item.create({
    data: {
      biblionumber,
      barcode,
      status,
      location,
      notforloan,
      ...overrides
    }
  });
};

export const updateSystemPreference = async (variable, value) => {
  return prisma.systemPreference.update({
    where: { variable },
    data: { value }
  });
};

export const getPrisma = () => prisma;
