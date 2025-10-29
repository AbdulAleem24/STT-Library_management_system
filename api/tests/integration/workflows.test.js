import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import {
  resetDatabase,
  seedBaseData,
  createAdminWithToken,
  createMemberWithToken,
  createBiblioRecord,
  createItemRecord
} from '../utils/testUtils.js';

const threeDaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 3);
  return date;
};

const fiveDaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 5);
  return date;
};

describe('Advanced Workflows', () => {
  let adminToken;
  let admin;

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
    ({ borrower: admin, token: adminToken } = await createAdminWithToken());
  });

  it('completes borrower lifecycle including fine payment', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        cardnumber: 'CARD-LIFE',
        fullName: 'Lifecycle Member',
        email: 'lifecycle@example.com',
        password: 'Lifecycle123!',
        categorycode: 'ADULT'
      });

    expect(registerResponse.status).toBe(201);
    const memberToken = registerResponse.body.data.token;
    const memberId = registerResponse.body.data.user.borrowernumber;

    const biblioResponse = await request(app)
      .post('/api/biblio')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Workflow Book',
        author: 'Workflow Author',
        itemtype: 'BOOK'
      });

    const biblionumber = biblioResponse.body.data.biblionumber;

    const itemResponse = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        biblionumber,
        barcode: 'WF-001',
        status: 'available',
        replacementprice: 30
      });

    const itemnumber = itemResponse.body.data.itemnumber;

    const checkoutResponse = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: memberId, barcode: 'WF-001' });

    expect(checkoutResponse.status).toBe(201);
    const issueId = checkoutResponse.body.data.issue_id;

    const renewResponse = await request(app)
      .post('/api/circulation/renew')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ issueId });

    expect(renewResponse.status).toBe(200);

    await prisma.issue.update({
      where: { issue_id: issueId },
      data: { date_due: threeDaysAgo() }
    });

    const returnResponse = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ issueId });

    expect(returnResponse.status).toBe(200);

    const fineLine = await prisma.accountLine.findFirst({ where: { issue_id: issueId } });
    expect(fineLine).not.toBeNull();

    const paymentResponse = await request(app)
      .post(`/api/accounts/${fineLine.accountlines_id}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: Number(fineLine.amountoutstanding), payment_type: 'cash' });

    expect(paymentResponse.status).toBe(200);
    expect(Number(paymentResponse.body.data.amountoutstanding)).toBe(0);
    expect(paymentResponse.body.data.status).toBe('paid');

    const item = await prisma.item.findUnique({ where: { itemnumber } });
    expect(item.status).toBe('available');
  });

  it('promotes holds when items are returned and allow next borrower to checkout', async () => {
    const { borrower: memberOne, token: memberOneToken } = await createMemberWithToken({
      cardnumber: 'MEM-HOLD-1',
      email: 'hold1@example.com'
    });
    const { borrower: memberTwo, token: memberTwoToken } = await createMemberWithToken({
      cardnumber: 'MEM-HOLD-2',
      email: 'hold2@example.com'
    });

    const biblio = await createBiblioRecord({ title: 'Hold Queue Book' });
    const item = await createItemRecord({
      biblionumber: biblio.biblionumber,
      barcode: 'HOLD-001'
    });

    const checkout = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberOneToken}`)
      .send({ borrowernumber: memberOne.borrowernumber, barcode: 'HOLD-001' });

    expect(checkout.status).toBe(201);

    const reserveResponse = await request(app)
      .post('/api/reserves')
      .set('Authorization', `Bearer ${memberTwoToken}`)
      .send({
        borrowernumber: memberTwo.borrowernumber,
        biblionumber: biblio.biblionumber
      });

    expect(reserveResponse.status).toBe(201);
    const reserveId = reserveResponse.body.data.reserve_id;

    const returnResponse = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${memberOneToken}`)
      .send({ issueId: checkout.body.data.issue_id });

    expect(returnResponse.status).toBe(200);

    const updatedReserve = await prisma.reserve.findUnique({ where: { reserve_id: reserveId } });
    expect(updatedReserve.found).toBe('W');

    const checkoutTwo = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberTwoToken}`)
      .send({ borrowernumber: memberTwo.borrowernumber, barcode: 'HOLD-001' });

    expect(checkoutTwo.status).toBe(201);
  });

  it('supports full item lifecycle including repeat checkout', async () => {
    const { borrower: member, token: memberToken } = await createMemberWithToken({
      cardnumber: 'MEM-LIFE',
      email: 'itemlife@example.com'
    });

    const biblio = await createBiblioRecord({ title: 'Lifecycle Title' });
    const item = await createItemRecord({
      biblionumber: biblio.biblionumber,
      barcode: 'LIFE-001'
    });

    const checkoutOne = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'LIFE-001' });

    expect(checkoutOne.status).toBe(201);

    const renewResponse = await request(app)
      .post('/api/circulation/renew')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ issueId: checkoutOne.body.data.issue_id });

    expect(renewResponse.status).toBe(200);
    expect(renewResponse.body.data.renewals_count).toBe(1);

    const returnResponse = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ issueId: checkoutOne.body.data.issue_id });

    expect(returnResponse.status).toBe(200);

    const checkoutAgain = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'LIFE-001' });

    expect(checkoutAgain.status).toBe(201);
  });

  it('accumulates fines for multiple overdue returns', async () => {
    const { borrower: member, token: memberToken } = await createMemberWithToken({
      cardnumber: 'MEM-FINES',
      email: 'fines@example.com'
    });

    const biblio = await createBiblioRecord({ title: 'Fine Book' });
    const itemOne = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'FINE-1' });
    const itemTwo = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'FINE-2' });

    const checkoutOne = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'FINE-1' });
    const checkoutTwo = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'FINE-2' });

    await prisma.issue.update({
      where: { issue_id: checkoutOne.body.data.issue_id },
      data: { date_due: fiveDaysAgo() }
    });
    await prisma.issue.update({
      where: { issue_id: checkoutTwo.body.data.issue_id },
      data: { date_due: fiveDaysAgo() }
    });

    await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ issueId: checkoutOne.body.data.issue_id });
    await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ issueId: checkoutTwo.body.data.issue_id });

    const accountLines = await prisma.accountLine.findMany({ where: { borrowernumber: member.borrowernumber } });
    expect(accountLines.length).toBeGreaterThanOrEqual(2);

    const totalOutstanding = accountLines.reduce(
      (sum, line) => sum + Number(line.amountoutstanding),
      0
    );
    expect(totalOutstanding).toBeGreaterThan(0);
  });

  it('blocks checkout when borrower reaches maximum item limit', async () => {
    await prisma.category.update({
      where: { categorycode: 'ADULT' },
      data: { max_checkout_count: 2 }
    });

    const { borrower: member, token: memberToken } = await createMemberWithToken({
      cardnumber: 'MEM-MAX',
      email: 'max@example.com'
    });

    const biblio = await createBiblioRecord({ title: 'Limit Book' });
    const barcodes = ['LIMIT-1', 'LIMIT-2', 'LIMIT-3'];

    for (let i = 0; i < 3; i += 1) {
      await createItemRecord({ biblionumber: biblio.biblionumber, barcode: barcodes[i] });
    }

    const first = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'LIMIT-1' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'LIMIT-2' });
    expect(second.status).toBe(201);

    const third = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'LIMIT-3' });

    expect(third.status).toBe(403);
    expect(third.body.message).toMatch(/maximum checkout limit/i);
  });

  it('creates replacement charge when item is marked lost', async () => {
    const { borrower: member, token: memberToken } = await createMemberWithToken({
      cardnumber: 'MEM-LOST',
      email: 'lost@example.com'
    });

    const biblio = await createBiblioRecord({ title: 'Lost Title' });
    const item = await createItemRecord({
      biblionumber: biblio.biblionumber,
      barcode: 'LOST-1',
      replacementprice: 40
    });

    const checkout = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'LOST-1' });

    expect(checkout.status).toBe(201);

    const updateResponse = await request(app)
      .put(`/api/items/${item.itemnumber}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'lost', notes: 'Reported lost by borrower' });

    expect(updateResponse.status).toBe(200);
    const lossCharge = await prisma.accountLine.findFirst({
      where: { issue_id: checkout.body.data.issue_id, accounttype: 'LOST' }
    });
    expect(lossCharge).not.toBeNull();
    expect(Number(lossCharge.amount)).toBe(40);

    const updatedIssue = await prisma.issue.findUnique({ where: { issue_id: checkout.body.data.issue_id } });
    expect(updatedIssue.returndate).not.toBeNull();
  });

  it('creates damage fee when item is marked damaged without duplicating charges', async () => {
    const { borrower: member, token: memberToken } = await createMemberWithToken({
      cardnumber: 'MEM-DAMAGE',
      email: 'damage@example.com'
    });

    const biblio = await createBiblioRecord({ title: 'Damage Title' });
    const item = await createItemRecord({
      biblionumber: biblio.biblionumber,
      barcode: 'DAM-1',
      replacementprice: 50
    });

    const checkout = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'DAM-1' });

    expect(checkout.status).toBe(201);

    const firstUpdate = await request(app)
      .put(`/api/items/${item.itemnumber}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'damaged', notes: 'Cover torn' });
    expect(firstUpdate.status).toBe(200);

    const secondUpdate = await request(app)
      .put(`/api/items/${item.itemnumber}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'damaged', notes: 'Duplicate update' });
    expect(secondUpdate.status).toBe(200);

    const damageCharges = await prisma.accountLine.findMany({
      where: { issue_id: checkout.body.data.issue_id, accounttype: 'DAMAGED' }
    });
    expect(damageCharges).toHaveLength(1);
    expect(Number(damageCharges[0].amount)).toBe(25);
  });
});
