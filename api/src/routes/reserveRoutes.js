import express from 'express';
import { index, store, cancel } from '../controllers/reserveController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createReserveValidator, cancelReserveValidator } from '../validators/reserveValidators.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reserves
 *   description: Holds management
 */

/**
 * @swagger
 * /reserves:
 *   get:
 *     summary: List active holds
 *     tags: [Reserves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reserves returned
 */
router.get('/', authenticate, index);

/**
 * @swagger
 * /reserves:
 *   post:
 *     summary: Place a hold on a title
 *     tags: [Reserves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [borrowernumber, biblionumber]
 *             properties:
 *               borrowernumber:
 *                 type: integer
 *               biblionumber:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Reserve created
 */
router.post('/', authenticate, validate(createReserveValidator), store);

/**
 * @swagger
 * /reserves/{id}/cancel:
 *   patch:
 *     summary: Cancel a hold request
 *     tags: [Reserves]
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
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reserve cancelled
 */
router.patch('/:id/cancel', authenticate, validate(cancelReserveValidator), cancel);

export default router;
