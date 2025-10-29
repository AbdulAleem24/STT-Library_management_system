import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import {
  resetDatabase,
  seedBaseData,
  createAdminWithToken,
  createBorrowerWithToken,
  createBiblioRecord
} from '../utils/testUtils.js';

describe('Biblio API', () => {
  let adminToken;

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
    ({ token: adminToken } = await createAdminWithToken());
  });

  it('creates a bibliographic record', async () => {
    const payload = {
      title: 'Test Driven Development',
      author: 'Kent Beck',
      isbn: '9780321146533',
      itemtype: 'BOOK'
    };

    const response = await request(app)
      .post('/api/biblio')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      title: 'Test Driven Development',
      author: 'Kent Beck',
      isbn: '9780321146533'
    });
  });

  it('lists bibliographic records for authenticated users', async () => {
    await createBiblioRecord({ title: 'Domain-Driven Design' });

    const response = await request(app)
      .get('/api/biblio')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Domain-Driven Design' })])
    );
  });

  it('shows details for a bibliographic record', async () => {
    const biblio = await createBiblioRecord({ title: 'Clean Code' });

    const response = await request(app)
      .get(`/api/biblio/${biblio.biblionumber}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('Clean Code');
  });

  it('updates a bibliographic record', async () => {
    const biblio = await createBiblioRecord({ title: 'Refactoring', author: 'Martin Fowler' });

    const response = await request(app)
      .put(`/api/biblio/${biblio.biblionumber}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Refactoring 2nd Edition',
        author: 'Martin Fowler'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('Refactoring 2nd Edition');
  });

  it('deletes a bibliographic record', async () => {
    const biblio = await createBiblioRecord({ title: 'To Delete' });

    const response = await request(app)
      .delete(`/api/biblio/${biblio.biblionumber}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const exists = await prisma.biblio.findUnique({ where: { biblionumber: biblio.biblionumber } });
    expect(exists).toBeNull();
  });

  it('prevents non-admin users from creating bibliographic records', async () => {
    const { token: memberToken } = await createBorrowerWithToken({
      cardnumber: 'MEMBER-BOOK',
      email: 'member.book@example.com'
    });

    const response = await request(app)
      .post('/api/biblio')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Member Attempt', itemtype: 'BOOK' });

    expect(response.status).toBe(403);
  });
});
