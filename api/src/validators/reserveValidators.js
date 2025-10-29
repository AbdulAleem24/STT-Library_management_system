import { body, param } from 'express-validator';

export const createReserveValidator = [
  body('borrowernumber').isInt().withMessage('Borrower id is required'),
  body('biblionumber').isInt().withMessage('Biblionumber is required'),
  body('itemnumber').optional().isInt()
];

export const cancelReserveValidator = [
  param('id').isInt().withMessage('Reserve id must be an integer')
];
