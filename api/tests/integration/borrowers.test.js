import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import {
  resetDatabase,
  seedBaseData,
  createAdminWithToken,
  createBorrowerWithToken,
  createBorrower
} from '../utils/testUtils.js';

describe('Borrower API', () => {
  let adminToken;
  let admin;

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
    ({ borrower: admin, token: adminToken } = await createAdminWithToken());
  });

  it('lists borrowers with admin authorization', async () => {
    await createBorrower({ fullName: 'Borrower One' });
    await createBorrower({ fullName: 'Borrower Two' });

    const response = await request(app)
      .get('/api/borrowers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ full_name: 'Borrower One' }),
        expect.objectContaining({ full_name: 'Borrower Two' })
      ])
    );
  expect(response.body.meta.total).toBeGreaterThanOrEqual(3); // includes admin
  });

  it('creates a borrower', async () => {
    const payload = {
      cardnumber: 'CARD-200',
      fullName: 'New Borrower',
      email: 'new.borrower@example.com',
      password: 'Borrower123!',
      categorycode: 'ADULT'
    };

    const response = await request(app)
      .post('/api/borrowers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      cardnumber: 'CARD-200',
      full_name: 'New Borrower',
      email: 'new.borrower@example.com'
    });

    const stored = await prisma.borrower.findUnique({ where: { cardnumber: 'CARD-200' } });
    expect(stored).not.toBeNull();
  });

  it('shows a borrower record', async () => {
    const borrower = await createBorrower({ fullName: 'Lookup Borrower' });

    const response = await request(app)
      .get(`/api/borrowers/${borrower.borrowernumber}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.full_name).toBe('Lookup Borrower');
  });

  it('updates a borrower', async () => {
    const borrower = await createBorrower({
      fullName: 'Old Name',
      email: 'old.email@example.com'
    });

    const response = await request(app)
      .put(`/api/borrowers/${borrower.borrowernumber}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Updated Name',
        email: 'new.email@example.com'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.full_name).toBe('Updated Name');
    expect(response.body.data.email).toBe('new.email@example.com');
  });

  it('deletes a borrower', async () => {
    const borrower = await createBorrower({ fullName: 'Delete Me' });

    const response = await request(app)
      .delete(`/api/borrowers/${borrower.borrowernumber}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const exists = await prisma.borrower.findUnique({ where: { borrowernumber: borrower.borrowernumber } });
    expect(exists).toBeNull();
  });

  it('prevents members from using borrower admin endpoints', async () => {
    const { token: memberToken } = await createBorrowerWithToken({
      cardnumber: 'MEMBER-200',
      email: 'member200@example.com'
    });

    const response = await request(app)
      .get('/api/borrowers')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(response.status).toBe(403);
  });
});
