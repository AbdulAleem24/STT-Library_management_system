import request from 'supertest';
import app from '../../src/app.js';
import {
  resetDatabase,
  seedBaseData,
  createBorrower,
  createBorrowerWithToken
} from '../utils/testUtils.js';

describe('Auth API', () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();
  });

  it('registers a new member and returns token', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        cardnumber: 'CARD-NEW',
        fullName: 'New Patron',
        email: 'new.patron@example.com',
        password: 'StrongPass123!',
        categorycode: 'ADULT'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      cardnumber: 'CARD-NEW',
      full_name: 'New Patron',
      email: 'new.patron@example.com',
      role: 'MEMBER'
    });
    expect(response.body.data.token).toBeDefined();
  });

  it('rejects duplicate email registrations', async () => {
    await createBorrower({ email: 'duplicate@example.com' });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        cardnumber: 'CARD-DUP',
        fullName: 'Duplicate Email',
        email: 'duplicate@example.com',
        password: 'StrongPass123!',
        categorycode: 'ADULT'
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('allows login with valid credentials', async () => {
    const borrower = await createBorrower({
      email: 'login@example.com',
      cardnumber: 'LOGIN-123',
      password: 'Password123!'
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: borrower.email,
        password: 'Password123!'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(borrower.email);
    expect(response.body.data.token).toBeDefined();
  });

  it('rejects login with invalid password', async () => {
    await createBorrower({
      email: 'wrongpass@example.com',
      cardnumber: 'LOGIN-FAIL',
      password: 'Correct123!'
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrongpass@example.com',
        password: 'Incorrect123!'
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns profile data for authenticated borrower', async () => {
    const { borrower, token } = await createBorrowerWithToken({
      fullName: 'Profile User',
      email: 'profile@example.com'
    });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.borrowernumber).toBe(borrower.borrowernumber);
    expect(response.body.data.password).toBeUndefined();
  });

  it('blocks profile access without token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
