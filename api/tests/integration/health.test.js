import request from 'supertest';
import app from '../../src/app.js';

describe('Health endpoints', () => {
  it('responds with health payload from /api/health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Library API is healthy' });
  });

  it('responds with welcome payload from root', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Welcome to the Library Management API' });
  });
});
