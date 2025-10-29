import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.category.upsert({
    where: { categorycode: 'ADULT' },
    update: {},
    create: {
      categorycode: 'ADULT',
      description: 'Adult Member',
      category_type: 'A',
      max_checkout_count: 5,
      loan_period_days: 14
    }
  });

  await prisma.category.upsert({
    where: { categorycode: 'CHILD' },
    update: {},
    create: {
      categorycode: 'CHILD',
      description: 'Child Member',
      category_type: 'C',
      max_checkout_count: 3,
      loan_period_days: 7
    }
  });

  await prisma.category.upsert({
    where: { categorycode: 'STAFF' },
    update: {},
    create: {
      categorycode: 'STAFF',
      description: 'Library Staff',
      category_type: 'S',
      max_checkout_count: 20,
      loan_period_days: 30
    }
  });

  const itemtypes = [
    { itemtype: 'BOOK', description: 'Book', rentalcharge: 0, defaultreplacecost: 25 },
    { itemtype: 'EBOOK', description: 'Electronic Book', rentalcharge: 0, defaultreplacecost: 0 },
    { itemtype: 'DVD', description: 'DVD', rentalcharge: 2, defaultreplacecost: 20 },
    { itemtype: 'MAGAZINE', description: 'Magazine', rentalcharge: 0, defaultreplacecost: 5 },
    { itemtype: 'AUDIO', description: 'Audio Book', rentalcharge: 1, defaultreplacecost: 15 }
  ];

  await Promise.all(
    itemtypes.map((item) =>
      prisma.itemType.upsert({
        where: { itemtype: item.itemtype },
        update: {},
        create: {
          itemtype: item.itemtype,
          description: item.description,
          rentalcharge: item.rentalcharge,
          defaultreplacecost: item.defaultreplacecost
        }
      })
    )
  );

  const systemPrefs = [
    { variable: 'version', value: '2.0.0', explanation: 'Database schema version (streamlined)', type: 'Free' },
    { variable: 'max_fine_allowed', value: '5.00', explanation: 'Maximum fine amount before checkouts are blocked', type: 'Currency' },
    { variable: 'fine_per_day', value: '0.25', explanation: 'Fine amount per day for overdue items', type: 'Currency' },
    { variable: 'max_renewals', value: '3', explanation: 'Maximum number of renewals allowed per item', type: 'Integer' },
    { variable: 'hold_expiry_days', value: '7', explanation: 'Number of days before canceling waiting hold', type: 'Integer' }
  ];

  await Promise.all(
    systemPrefs.map((pref) =>
      prisma.systemPreference.upsert({
        where: { variable: pref.variable },
        update: {
          value: pref.value,
          explanation: pref.explanation,
          type: pref.type
        },
        create: pref
      })
    )
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
