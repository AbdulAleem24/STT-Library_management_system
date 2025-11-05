import request from 'supertest';
import app from '../../src/app.js';
import {
  resetDatabase,
  seedBaseData,
  createAdminWithToken,
  createMemberWithToken,
  createBorrowerWithToken,
  createBiblioRecord,
  createItemRecord
} from '../utils/testUtils.js';

describe('Reserve API', () => {
  let adminToken;
  let memberToken;
  let member;
  let holder;
  let biblio;
  let item;

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
    ({ token: adminToken } = await createAdminWithToken());
    ({ borrower: member, token: memberToken } = await createMemberWithToken());
    ({ borrower: holder } = await createMemberWithToken({
      cardnumber: 'RES-HOLDER',
      email: 'reserve.holder@example.com'
    }));
    biblio = await createBiblioRecord({ title: 'Reserve Book' });
    item = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'RES-001' });

    await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ borrowernumber: holder.borrowernumber, barcode: 'RES-001' });
  });

  it('allows members to place holds for themselves', async () => {
    const response = await request(app)
      .post('/api/reserves')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        borrowernumber: member.borrowernumber,
        biblionumber: biblio.biblionumber
      });

    expect(response.status).toBe(201);
    expect(response.body.data.borrowernumber).toBe(member.borrowernumber);
  });

  it('prevents members from placing holds for others', async () => {
    const { borrower: otherMember, token: otherToken } = await createBorrowerWithToken({
      cardnumber: 'RES-OTHER',
      email: 'reserve.other@example.com'
    });

    const response = await request(app)
      .post('/api/reserves')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        borrowernumber: member.borrowernumber,
        biblionumber: biblio.biblionumber
      });

    expect(response.status).toBe(403);
    expect(otherMember.borrowernumber).not.toBe(member.borrowernumber);
  });

  it('rejects duplicate holds for the same borrower and title', async () => {
    await request(app)
      .post('/api/reserves')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        borrowernumber: member.borrowernumber,
        biblionumber: biblio.biblionumber
      });

    const response = await request(app)
      .post('/api/reserves')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        borrowernumber: member.borrowernumber,
        biblionumber: biblio.biblionumber
      });

    expect(response.status).toBe(409);
  });

  it('cancels a hold', async () => {
    const reserveResponse = await request(app)
      .post('/api/reserves')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        borrowernumber: member.borrowernumber,
        biblionumber: biblio.biblionumber,
        itemnumber: item.itemnumber
      });

    const reserveId = reserveResponse.body.data.reserve_id;

    const cancelResponse = await request(app)
      .patch(`/api/reserves/${reserveId}/cancel`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reason: 'No longer needed' });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.data.cancellationdate).not.toBeNull();
  });

  it('lists reserves with optional borrower filter', async () => {
    await request(app)
      .post('/api/reserves')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        borrowernumber: member.borrowernumber,
        biblionumber: biblio.biblionumber
      });

    const response = await request(app)
      .get(`/api/reserves?borrower=${member.borrowernumber}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borrowernumber: member.borrowernumber })
      ])
    );
  });
});
