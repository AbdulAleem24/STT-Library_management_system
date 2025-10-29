import { body, param } from 'express-validator';

export const createItemValidator = [
  body('biblionumber').isInt().withMessage('Biblionumber is required'),
  body('barcode').isString().notEmpty().withMessage('Barcode is required'),
  body('status').optional().isIn(['available', 'checked_out', 'lost', 'damaged', 'withdrawn']),
  body('notforloan').optional().isBoolean(),
  body('location').optional().isString()
];

export const updateItemValidator = [
  param('id').isInt().withMessage('Item id must be an integer'),
  body('status').optional().isIn(['available', 'checked_out', 'lost', 'damaged', 'withdrawn']),
  body('notforloan').optional().isBoolean(),
  body('location').optional().isString(),
  body('notes').optional().isString()
];
