import express from 'express';
import { index, show, store, update, destroy } from '../controllers/biblioController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBiblioValidator, updateBiblioValidator } from '../validators/biblioValidators.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Biblio
 *   description: Bibliographic records
 */

router
	.route('/')
	/**
	 * @swagger
	 * /biblio:
	 *   get:
	 *     summary: List bibliographic records
	 *     tags: [Biblio]
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
	 *       - in: query
	 *         name: sort
	 *         schema:
	 *           type: string
	 *     responses:
	 *       200:
	 *         description: Biblio list returned
	 */
	.get(authenticate, index)
	/**
	 * @swagger
	 * /biblio:
	 *   post:
	 *     summary: Create a bibliographic record
	 *     tags: [Biblio]
	 *     security:
	 *       - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required: [title, itemtype]
	 *             properties:
	 *               title:
	 *                 type: string
	 *               author:
	 *                 type: string
	 *               isbn:
	 *                 type: string
	 *               publicationyear:
	 *                 type: integer
	 *               itemtype:
	 *                 type: string
	 *     responses:
	 *       201:
	 *         description: Biblio record created
	 */
	.post(authenticate, authorize('ADMIN'), validate(createBiblioValidator), store);

router
	.route('/:id')
	/**
	 * @swagger
	 * /biblio/{id}:
	 *   get:
	 *     summary: Fetch a bibliographic record
	 *     tags: [Biblio]
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
	 *         description: Biblio record details
	 *       404:
	 *         description: Record not found
	 */
	.get(authenticate, show)
	/**
	 * @swagger
	 * /biblio/{id}:
	 *   put:
	 *     summary: Update a bibliographic record
	 *     tags: [Biblio]
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
	 *         description: Biblio record updated
	 */
	.put(authenticate, authorize('ADMIN'), validate(updateBiblioValidator), update)
	/**
	 * @swagger
	 * /biblio/{id}:
	 *   delete:
	 *     summary: Delete a bibliographic record
	 *     tags: [Biblio]
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
	 *         description: Biblio record removed
	 */
	.delete(authenticate, authorize('ADMIN'), destroy);

export default router;
