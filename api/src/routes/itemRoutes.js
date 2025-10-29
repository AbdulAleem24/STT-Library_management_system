import express from 'express';
import { index, show, store, update, destroy } from '../controllers/itemController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createItemValidator, updateItemValidator } from '../validators/itemValidators.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Physical copies
 */

router
	.route('/')
	/**
	 * @swagger
	 * /items:
	 *   get:
	 *     summary: List items with status filters
	 *     tags: [Items]
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
	 *         name: status
	 *         schema:
	 *           type: string
	 *       - in: query
	 *         name: sort
	 *         schema:
	 *           type: string
	 *     responses:
	 *       200:
	 *         description: Item collection returned
	 */
	.get(authenticate, index)
	/**
	 * @swagger
	 * /items:
	 *   post:
	 *     summary: Create a library item
	 *     tags: [Items]
	 *     security:
	 *       - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required: [biblionumber, barcode, status]
	 *             properties:
	 *               biblionumber:
	 *                 type: integer
	 *               barcode:
	 *                 type: string
	 *               status:
	 *                 type: string
	 *     responses:
	 *       201:
	 *         description: Item created
	 */
	.post(authenticate, authorize('ADMIN'), validate(createItemValidator), store);

router
	.route('/:id')
	/**
	 * @swagger
	 * /items/{id}:
	 *   get:
	 *     summary: Get item details
	 *     tags: [Items]
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: id
	 *         schema:
	 *           type: integer
	 *         required: true
	 *     responses:
	 *       200:
	 *         description: Item detail returned
	 *       404:
	 *         description: Item not found
	 */
	.get(authenticate, show)
	/**
	 * @swagger
	 * /items/{id}:
	 *   put:
	 *     summary: Update item metadata
	 *     tags: [Items]
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: id
	 *         schema:
	 *           type: integer
	 *         required: true
	 *     requestBody:
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *     responses:
	 *       200:
	 *         description: Item updated
	 */
	.put(authenticate, authorize('ADMIN'), validate(updateItemValidator), update)
	/**
	 * @swagger
	 * /items/{id}:
	 *   delete:
	 *     summary: Remove an item from inventory
	 *     tags: [Items]
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: id
	 *         schema:
	 *           type: integer
	 *         required: true
	 *     responses:
	 *       200:
	 *         description: Item removed
	 */
	.delete(authenticate, authorize('ADMIN'), destroy);

export default router;
