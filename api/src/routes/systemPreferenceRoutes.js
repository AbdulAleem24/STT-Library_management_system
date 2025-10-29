import express from 'express';
import { index, update } from '../controllers/systemPreferenceController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updatePreferenceValidator } from '../validators/systemPreferenceValidators.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SystemPreferences
 *   description: System configuration
 */

/**
 * @swagger
 * /system-preferences:
 *   get:
 *     summary: List system preferences
 *     tags: [SystemPreferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preference list returned
 */
router.get('/', authenticate, authorize('ADMIN'), index);

/**
 * @swagger
 * /system-preferences/{variable}:
 *   put:
 *     summary: Update a system preference
 *     tags: [SystemPreferences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: variable
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Preference updated
 */
router.put('/:variable', authenticate, authorize('ADMIN'), validate(updatePreferenceValidator), update);

export default router;
