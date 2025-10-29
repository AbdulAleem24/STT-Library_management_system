import jwt from 'jsonwebtoken';
import { generateToken } from '../../../src/utils/token.js';
import { config } from '../../../src/config/env.js';

describe('generateToken', () => {
  it('signs payload with configured secret', () => {
    const payload = { id: 123, role: 'MEMBER' };
    const token = generateToken(payload);
    const decoded = jwt.verify(token, config.jwtSecret);

    expect(decoded).toMatchObject(payload);
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});
