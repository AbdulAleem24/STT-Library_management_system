import { body, param } from 'express-validator';

export const payFineValidator = [
  param('id').isInt().withMessage('Account line id must be an integer'),
  body('amount').isFloat({ gt: 0 }).withMessage('Payment amount must be greater than zero'),
  body('payment_type').optional().isString()
];
