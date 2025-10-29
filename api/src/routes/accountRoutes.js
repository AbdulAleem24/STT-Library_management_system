import express from 'express';
import { index, pay } from '../controllers/accountController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { payFineValidator } from '../validators/accountValidators.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Fines and payments
 */

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: List account lines and fines
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: borrowernumber
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account lines returned
 */
router.get('/', authenticate, index);

/**
 * @swagger
 * /accounts/{id}/pay:
 *   post:
 *     summary: Record a fine payment
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *               method:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment recorded
 */
router.post('/:id/pay', authenticate, authorize('ADMIN'), validate(payFineValidator), pay);

export default router;
