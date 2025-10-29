import express from 'express';
import { index, show, store, update, destroy } from '../controllers/borrowerController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBorrowerValidator, updateBorrowerValidator } from '../validators/borrowerValidators.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Borrowers
 *   description: Patron administration
 */

router.use(authenticate, authorize('ADMIN'));

router
  .route('/')
  /**
   * @swagger
   * /borrowers:
   *   get:
   *     summary: List borrowers with pagination
   *     tags: [Borrowers]
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
   *         description: Borrower list
   */
  .get(index)
  /**
   * @swagger
   * /borrowers:
   *   post:
   *     summary: Create a borrower
   *     tags: [Borrowers]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [cardnumber, fullName, password, categorycode]
   *             properties:
   *               cardnumber:
   *                 type: string
   *               fullName:
   *                 type: string
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *               categorycode:
   *                 type: string
   *               role:
   *                 type: string
   *     responses:
   *       201:
   *         description: Borrower created
   */
  .post(validate(createBorrowerValidator), store);

router
  .route('/:id')
  /**
   * @swagger
   * /borrowers/{id}:
   *   get:
   *     summary: Get borrower details
   *     tags: [Borrowers]
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
   *         description: Borrower details
   */
  .get(show)
  /**
   * @swagger
   * /borrowers/{id}:
   *   put:
   *     summary: Update borrower
   *     tags: [Borrowers]
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
   *         description: Borrower updated
   */
  .put(validate(updateBorrowerValidator), update)
  /**
   * @swagger
   * /borrowers/{id}:
   *   delete:
   *     summary: Delete borrower
   *     tags: [Borrowers]
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
   *         description: Borrower deleted
   */
  .delete(destroy);

export default router;
