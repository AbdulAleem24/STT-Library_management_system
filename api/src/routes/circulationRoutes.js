import express from 'express';
import { checkout, processReturn, renew, history } from '../controllers/circulationController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
	checkoutValidator,
	returnValidator,
	renewValidator,
	historyValidator
} from '../validators/circulationValidators.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Circulation
 *   description: Checkout, return, and renewal actions
 */

/**
 * @swagger
 * /circulation/checkout:
 *   post:
 *     summary: Checkout an item to a member
 *     tags: [Circulation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [borrowernumber, barcode]
 *             properties:
 *               borrowernumber:
 *                 type: integer
 *               barcode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item checked out
 */
router.post('/checkout', authenticate, validate(checkoutValidator), checkout);

/**
 * @swagger
 * /circulation/return:
 *   post:
 *     summary: Process an item return
 *     tags: [Circulation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [barcode]
 *             properties:
 *               barcode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Return completed
 */
router.post('/return', authenticate, validate(returnValidator), processReturn);

/**
 * @swagger
 * /circulation/renew:
 *   post:
 *     summary: Renew an active checkout
 *     tags: [Circulation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [issue_id]
 *             properties:
 *               issue_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Renewal successful
 */
router.post('/renew', authenticate, validate(renewValidator), renew);

router.get('/history', authenticate, authorize('ADMIN'), validate(historyValidator), history);

export default router;
