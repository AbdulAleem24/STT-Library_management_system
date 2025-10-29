import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import prisma from '../../src/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const setupDir = path.dirname(__filename);

dotenv.config({
	path: path.resolve(setupDir, '../../.env.test'),
	override: true
});

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '0';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS || '4';

afterAll(async () => {
	await prisma.$disconnect().catch(() => undefined);
});
