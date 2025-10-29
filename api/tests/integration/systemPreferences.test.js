import request from 'supertest';
import app from '../../src/app.js';
import {
  resetDatabase,
  seedBaseData,
  createAdminWithToken,
  createMemberWithToken
} from '../utils/testUtils.js';

describe('System Preferences API', () => {
  let adminToken;
  let memberToken;

  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
    ({ token: adminToken } = await createAdminWithToken());
    ({ token: memberToken } = await createMemberWithToken({
      cardnumber: 'SYS-MEMBER',
      email: 'sys.member@example.com'
    }));
  });

  it('lists system preferences for admins', async () => {
    const response = await request(app)
      .get('/api/system-preferences')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty('variable');
  });

  it('updates a system preference value', async () => {
    const response = await request(app)
      .put('/api/system-preferences/fine_per_day')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: '0.50', explanation: 'Updated for testing' });

    expect(response.status).toBe(200);
    expect(response.body.data.value).toBe('0.50');
  });

  it('rejects non-admin access', async () => {
    const response = await request(app)
      .get('/api/system-preferences')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(response.status).toBe(403);
  });
});
