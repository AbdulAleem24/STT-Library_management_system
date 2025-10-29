import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import {
  resetDatabase,
  seedBaseData,
  createAdminWithToken,
  createMemberWithToken,
  createBorrowerWithToken
} from '../utils/testUtils.js';

describe('Accounts API', () => {
  let adminToken;
  let memberToken;
  let member;

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
    ({ token: adminToken } = await createAdminWithToken());
    ({ borrower: member, token: memberToken } = await createMemberWithToken());
  });

  it('allows members to list only their own account lines', async () => {
    await prisma.accountLine.create({
      data: {
        borrowernumber: member.borrowernumber,
        amount: 5,
        amountoutstanding: 5,
        description: 'Late fee',
        accounttype: 'OVERDUE',
        status: 'open'
      }
    });

    const response = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].borrowernumber).toBe(member.borrowernumber);
  });

  it('allows admins to view all account lines', async () => {
    const { borrower: otherBorrower } = await createBorrowerWithToken({
      cardnumber: 'ACC-002',
      email: 'acc2@example.com'
    });

    await prisma.accountLine.createMany({
      data: [
        {
          borrowernumber: member.borrowernumber,
          amount: 5,
          amountoutstanding: 5,
          description: 'Late fee',
          accounttype: 'OVERDUE',
          status: 'open'
        },
        {
          borrowernumber: otherBorrower.borrowernumber,
          amount: 3,
          amountoutstanding: 3,
          description: 'Replacement card',
          accounttype: 'MANUAL',
          status: 'open'
        }
      ]
    });

    const response = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('records payments by admin users', async () => {
    const fine = await prisma.accountLine.create({
      data: {
        borrowernumber: member.borrowernumber,
        amount: 5,
        amountoutstanding: 5,
        description: 'Lost item',
        accounttype: 'LOST',
        status: 'open'
      }
    });

    const response = await request(app)
      .post(`/api/accounts/${fine.accountlines_id}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 5, payment_type: 'cash' });

  expect(response.status).toBe(200);
  expect(Number(response.body.data.amountoutstanding)).toBe(0); // fully paid
  expect(response.body.data.status).toBe('paid');
  });

  it('prevents members from recording payments', async () => {
    const fine = await prisma.accountLine.create({
      data: {
        borrowernumber: member.borrowernumber,
        amount: 5,
        amountoutstanding: 5,
        description: 'Manual fine',
        accounttype: 'MANUAL',
        status: 'open'
      }
    });

    const response = await request(app)
      .post(`/api/accounts/${fine.accountlines_id}/pay`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ amount: 5 });

    expect(response.status).toBe(403);
  });
});
