import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import {
  resetDatabase,
  seedBaseData,
  createAdminWithToken,
  createMemberWithToken,
  createBiblioRecord,
  createItemRecord,
  updateSystemPreference
} from '../utils/testUtils.js';

describe('Edge Case Scenarios', () => {
  let adminToken;

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
    ({ token: adminToken } = await createAdminWithToken());
  });

  it('prevents concurrent checkouts of the same item', async () => {
    const { borrower: member, token: memberToken } = await createMemberWithToken();
    const biblio = await createBiblioRecord({ title: 'Concurrency Book' });
    await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'CONCUR-1' });

    const first = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'CONCUR-1' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'CONCUR-1' });
    expect(second.status).toBe(409);
  });

  it('assigns sequential priorities for race conditions in hold queue', async () => {
    const { borrower: member1, token: token1 } = await createMemberWithToken({
      cardnumber: 'HOLD-SEQ-1',
      email: 'holdseq1@example.com'
    });
    const { borrower: member2, token: token2 } = await createMemberWithToken({
      cardnumber: 'HOLD-SEQ-2',
      email: 'holdseq2@example.com'
    });
    const biblio = await createBiblioRecord({ title: 'Priority Book' });

    const first = await request(app)
      .post('/api/reserves')
      .set('Authorization', `Bearer ${token1}`)
      .send({ borrowernumber: member1.borrowernumber, biblionumber: biblio.biblionumber });
    const second = await request(app)
      .post('/api/reserves')
      .set('Authorization', `Bearer ${token2}`)
      .send({ borrowernumber: member2.borrowernumber, biblionumber: biblio.biblionumber });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const reserves = await prisma.reserve.findMany({
      where: { biblionumber: biblio.biblionumber },
      orderBy: { priority: 'asc' }
    });

    expect(reserves[0].priority).toBe(1);
    expect(reserves[1].priority).toBe(2);
  });

  it('blocks checkout when item already issued to another borrower', async () => {
    const { borrower: member1, token: token1 } = await createMemberWithToken();
    const { borrower: member2, token: token2 } = await createMemberWithToken({
      cardnumber: 'CHECK-ALT',
      email: 'checkalt@example.com'
    });
    const biblio = await createBiblioRecord({ title: 'Issued Book' });
    await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'ISSUE-1' });

    await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${token1}`)
      .send({ borrowernumber: member1.borrowernumber, barcode: 'ISSUE-1' });

    const response = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${token2}`)
      .send({ borrowernumber: member2.borrowernumber, barcode: 'ISSUE-1' });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/currently checked_out/i);
  });

  it('rejects returns for items that are not on loan', async () => {
    const { borrower: member, token: memberToken } = await createMemberWithToken();
    const biblio = await createBiblioRecord({ title: 'Return Book' });
    const item = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'RETURN-1' });

    const response = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ barcode: 'RETURN-1' });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/active issue not found/i);

    const storedItem = await prisma.item.findUnique({ where: { itemnumber: item.itemnumber } });
    expect(storedItem.status).toBe('available');
  });

  it('validates circulation history date ranges', async () => {
    const response = await request(app)
      .get('/api/circulation/history?issuedFrom=2025-12-01&issuedTo=2025-01-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/issuedFrom must be before issuedTo/i);
  });

  it('calculates extremely large fines without overflow', async () => {
    const { borrower: member, token: memberToken } = await createMemberWithToken();
    const biblio = await createBiblioRecord({ title: 'High Fine Book' });
    await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'FINE-HUGE' });

    await updateSystemPreference('fine_per_day', '1000');

    const checkout = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'FINE-HUGE' });

    const issueId = checkout.body.data.issue_id;

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 10);

    await prisma.issue.update({
      where: { issue_id: issueId },
      data: { date_due: overdueDate }
    });

    await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ issueId });

    const fine = await prisma.accountLine.findFirst({ where: { issue_id: issueId } });
    const daysLateMatch = fine.description?.match(/(\d+)/);
    const daysLate = daysLateMatch ? Number(daysLateMatch[1]) : 0;
    expect(daysLate).toBeGreaterThanOrEqual(10);
    expect(Number(fine.amount)).toBe(daysLate * 1000);
  });

  it('handles borrowers with Unicode names', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        cardnumber: 'UNICODE-1',
        fullName: 'Zoë Hernández',
        email: 'unicode@example.com',
        password: 'Unicode123!',
        categorycode: 'ADULT'
      });

    expect(response.status).toBe(201);

    const search = await request(app)
      .get('/api/borrowers?search=Zoë')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(search.status).toBe(200);
    expect(search.body.data[0].full_name).toBe('Zoë Hernández');
  });

  it('ignores SQL injection attempts in borrower search', async () => {
    await prisma.borrower.create({
      data: {
        cardnumber: 'SQL-1',
        full_name: 'Safe User',
        email: 'safe@example.com',
        password: 'hashed',
        categorycode: 'ADULT'
      }
    });

    const response = await request(app)
      .get("/api/borrowers?search=' OR 1=1 --")
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeLessThanOrEqual(1);
  });

  it('handles very large pagination offsets gracefully', async () => {
    const response = await request(app)
      .get('/api/borrowers?page=600&limit=20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
  });
});
