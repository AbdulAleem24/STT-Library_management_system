import { body, param } from 'express-validator';

export const createBiblioValidator = [
  body('title').isString().trim().notEmpty().withMessage('Title is required'),
  body('author').optional().isString(),
  body('isbn').optional().isString().isLength({ min: 10, max: 17 }).withMessage('ISBN must be between 10 and 17 characters'),
  body('publicationyear').optional().isInt({ min: 1000, max: 2500 }),
  body('itemtype').optional().isString()
];

export const updateBiblioValidator = [
  param('id').isInt().withMessage('Biblio id must be an integer'),
  body('title').optional().isString().trim().notEmpty(),
  body('author').optional().isString(),
  body('isbn').optional().isString().isLength({ min: 10, max: 17 }),
  body('publicationyear').optional().isInt({ min: 1000, max: 2500 }),
  body('itemtype').optional().isString()
];
