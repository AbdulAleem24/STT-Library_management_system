import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import {
  resetDatabase,
  seedBaseData,
  createAdminWithToken,
  createBorrowerWithToken,
  createBiblioRecord,
  createItemRecord
} from '../utils/testUtils.js';

describe('Item API', () => {
  let adminToken;
  let biblio;

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
    ({ token: adminToken } = await createAdminWithToken());
    biblio = await createBiblioRecord({ title: 'Inventory Book' });
  });

  it('creates a library item', async () => {
    const response = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        biblionumber: biblio.biblionumber,
        barcode: 'ITEM-001',
        status: 'available'
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      biblionumber: biblio.biblionumber,
      barcode: 'ITEM-001',
      status: 'available'
    });
  });

  it('lists items with authentication', async () => {
    await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'INV-123' });

    const response = await request(app)
      .get('/api/items')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ barcode: 'INV-123' })])
    );
  });

  it('shows item details', async () => {
    const item = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'INV-DETAIL' });

    const response = await request(app)
      .get(`/api/items/${item.itemnumber}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.barcode).toBe('INV-DETAIL');
  });

  it('updates item status and notes', async () => {
    const item = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'INV-UPD' });

    const response = await request(app)
      .put(`/api/items/${item.itemnumber}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'damaged',
        notes: 'Needs repair'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('damaged');
    expect(response.body.data.notes).toBe('Needs repair');
  });

  it('deletes an item', async () => {
    const item = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'INV-DEL' });

    const response = await request(app)
      .delete(`/api/items/${item.itemnumber}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const exists = await prisma.item.findUnique({ where: { itemnumber: item.itemnumber } });
    expect(exists).toBeNull();
  });

  it('prevents non-admins from creating items', async () => {
    const { token: memberToken } = await createBorrowerWithToken({
      cardnumber: 'INV-MEMBER',
      email: 'inv.member@example.com'
    });

    const response = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ biblionumber: biblio.biblionumber, barcode: 'MEM-ITEM', status: 'available' });

    expect(response.status).toBe(403);
  });
});
