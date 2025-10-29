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

describe('Search and Filtering', () => {
  let adminToken;
  let admin;

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
    ({ borrower: admin, token: adminToken } = await createAdminWithToken());
  });

  it('searches borrowers by name and email case-insensitively', async () => {
    await prisma.borrower.createMany({
      data: [
        {
          cardnumber: 'SEARCH-1',
          full_name: 'Alice Johnson',
          email: 'alice@example.com',
          password: admin.password,
          categorycode: 'ADULT'
        },
        {
          cardnumber: 'SEARCH-2',
          full_name: 'Bob Smith',
          email: 'bob@example.com',
          password: admin.password,
          categorycode: 'ADULT'
        }
      ]
    });

    const response = await request(app)
      .get('/api/borrowers?search=ALICE')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.some((borrower) => borrower.full_name === 'Alice Johnson')).toBe(true);

    const emailSearch = await request(app)
      .get('/api/borrowers?search=bob@example.com')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(emailSearch.status).toBe(200);
    expect(emailSearch.body.data).toHaveLength(1);
    expect(emailSearch.body.data[0].email).toBe('bob@example.com');
  });

  it('supports partial match searches for borrowers', async () => {
    await prisma.borrower.create({
      data: {
        cardnumber: 'SEARCH-3',
        full_name: 'Caroline Adams',
        email: 'caroline@example.com',
        password: admin.password,
        categorycode: 'ADULT'
      }
    });

    const response = await request(app)
      .get('/api/borrowers?search=caro')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0].full_name).toBe('Caroline Adams');
  });

  it('returns empty result sets when search does not match', async () => {
    const response = await request(app)
      .get('/api/borrowers?search=no-such-user')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
    expect(response.body.meta.total).toBe(0);
  });

  it('sorts borrowers in ascending order', async () => {
    await prisma.borrower.createMany({
      data: [
        {
          cardnumber: 'SORT-1',
          full_name: 'Zelda Brown',
          email: 'zelda@example.com',
          password: admin.password,
          categorycode: 'ADULT'
        },
        {
          cardnumber: 'SORT-2',
          full_name: 'Aaron Clark',
          email: 'aaron@example.com',
          password: admin.password,
          categorycode: 'ADULT'
        }
      ]
    });

    const response = await request(app)
      .get('/api/borrowers?sort=full_name:asc')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0].full_name).toBe('Aaron Clark');
  });

  it('filters items by status and combined barcode search', async () => {
    const biblio = await createBiblioRecord({ title: 'Filter Title' });
    await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'STATUS-1', status: 'available' });
    await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'STATUS-2', status: 'damaged' });

    const statusResponse = await request(app)
      .get('/api/items?status=damaged')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.data).toHaveLength(1);
    expect(statusResponse.body.data[0].status).toBe('damaged');

    const combinedResponse = await request(app)
      .get('/api/items?status=damaged&search=status-2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(combinedResponse.status).toBe(200);
    expect(combinedResponse.body.data).toHaveLength(1);
    expect(combinedResponse.body.data[0].barcode).toBe('STATUS-2');
  });

  it('returns circulation history filtered by issued and return dates', async () => {
    const { borrower: member, token: memberToken } = await createMemberWithToken({
      cardnumber: 'HIST-1',
      email: 'history@example.com'
    });
    const biblio = await createBiblioRecord({ title: 'History Book' });
    const item = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'HIST-ITEM' });

    const checkout = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ borrowernumber: member.borrowernumber, barcode: 'HIST-ITEM' });

    const issueId = checkout.body.data.issue_id;

    await prisma.issue.update({
      where: { issue_id: issueId },
      data: {
        issuedate: new Date('2025-01-05T10:00:00Z'),
        date_due: new Date('2025-01-12T10:00:00Z'),
        returndate: new Date('2025-01-10T10:00:00Z')
      }
    });

    const response = await request(app)
      .get('/api/circulation/history?issuedFrom=2025-01-01&issuedTo=2025-01-31&returnedFrom=2025-01-09&returnedTo=2025-01-11')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data[0].item.barcode).toBe('HIST-ITEM');
  });

  it('supports large pagination requests without error', async () => {
    const bulk = [];
    for (let i = 0; i < 60; i += 1) {
      bulk.push({
        cardnumber: `BULK-${i}`,
        full_name: `Bulk User ${i}`,
        email: `bulk${i}@example.com`,
        password: admin.password,
        categorycode: 'ADULT'
      });
    }
    await prisma.borrower.createMany({ data: bulk });

    const response = await request(app)
      .get('/api/borrowers?page=3&limit=25')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.page).toBe(3);
  });
});
