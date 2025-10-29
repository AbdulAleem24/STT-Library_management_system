import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import {
  resetDatabase,
  seedBaseData,
  createAdminWithToken,
  createMemberWithToken,
  createBorrowerWithToken,
  createBiblioRecord,
  createItemRecord,
  updateSystemPreference
} from '../utils/testUtils.js';

describe('Circulation API', () => {
  let adminToken;
  let memberToken;
  let member;
  let item;

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
    ({ token: adminToken } = await createAdminWithToken());
    ({ borrower: member, token: memberToken } = await createMemberWithToken());
    const biblio = await createBiblioRecord({ title: 'Circulation Book' });
    item = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'CIRC-001' });
  });

  const checkout = (token, payload) =>
    request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

  it('allows staff to checkout items for members', async () => {
    const response = await checkout(adminToken, {
      borrowernumber: member.borrowernumber,
      barcode: 'CIRC-001'
    });

    expect(response.status).toBe(201);
    expect(response.body.data.borrowernumber).toBe(member.borrowernumber);

    const updatedItem = await prisma.item.findUnique({ where: { itemnumber: item.itemnumber } });
    expect(updatedItem.status).toBe('checked_out');
  });

  it('prevents members from checkout out items for others', async () => {
    const { borrower: otherMember, token: otherToken } = await createBorrowerWithToken({
      cardnumber: 'MEM-OTHER',
      email: 'other.member@example.com'
    });

    const response = await checkout(otherToken, {
      borrowernumber: member.borrowernumber,
      barcode: 'CIRC-001'
    });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(otherMember.borrowernumber).not.toBe(member.borrowernumber);
  });

  it('allows members to checkout for themselves', async () => {
    const response = await checkout(memberToken, {
      borrowernumber: member.borrowernumber,
      barcode: 'CIRC-001'
    });

    expect(response.status).toBe(201);
    expect(response.body.data.borrowernumber).toBe(member.borrowernumber);
  });

  it('renews an active issue', async () => {
    const checkoutResponse = await checkout(memberToken, {
      borrowernumber: member.borrowernumber,
      barcode: 'CIRC-001'
    });

    const issueId = checkoutResponse.body.data.issue_id;

    const renewResponse = await request(app)
      .post('/api/circulation/renew')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ issueId });

    expect(renewResponse.status).toBe(200);
    expect(renewResponse.body.data.renewals_count).toBe(1);
  });

  it('processes returns and calculates overdue fines', async () => {
    const checkoutResponse = await checkout(memberToken, {
      borrowernumber: member.borrowernumber,
      barcode: 'CIRC-001'
    });

    const issueId = checkoutResponse.body.data.issue_id;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    await prisma.issue.update({
      where: { issue_id: issueId },
      data: { date_due: threeDaysAgo }
    });

    const returnResponse = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ issueId });

    expect(returnResponse.status).toBe(200);
    expect(returnResponse.body.data.returndate).not.toBeNull();

  const accountLines = await prisma.accountLine.findMany({ where: { issue_id: issueId } });
  expect(accountLines.length).toBeGreaterThan(0);
  expect(Number(accountLines[0].amountoutstanding)).toBeGreaterThan(0);

    const updatedItem = await prisma.item.findUnique({ where: { itemnumber: item.itemnumber } });
    expect(updatedItem.status).toBe('available');
  });

  it('blocks renewals when the maximum is reached', async () => {
    await updateSystemPreference('max_renewals', '1');

    const checkoutResponse = await checkout(memberToken, {
      borrowernumber: member.borrowernumber,
      barcode: 'CIRC-001'
    });

    const issueId = checkoutResponse.body.data.issue_id;

    await prisma.issue.update({
      where: { issue_id: issueId },
      data: { renewals_count: 1 }
    });

    const renewResponse = await request(app)
      .post('/api/circulation/renew')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ issueId });

    expect(renewResponse.status).toBe(403);
    expect(renewResponse.body.success).toBe(false);
  });
});
