import { body, param } from 'express-validator';

export const createBorrowerValidator = [
  body('cardnumber').isString().isLength({ min: 3 }).withMessage('Card number must be at least 3 characters'),
  body('fullName').isString().trim().notEmpty().withMessage('Full name is required'),
  body('email').optional().isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('categorycode').isString().withMessage('Category code is required'),
  body('role').optional().isIn(['ADMIN', 'MEMBER']).withMessage('Invalid role')
];

export const updateBorrowerValidator = [
  param('id').isInt().withMessage('Borrower id must be an integer'),
  body('fullName').optional().isString().trim().notEmpty(),
  body('preferredName').optional().isString().trim(),
  body('email').optional().isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('phone').optional().isString(),
  body('dateexpiry').optional().isISO8601().toDate(),
  body('debarred').optional().isISO8601().toDate(),
  body('role').optional().isIn(['ADMIN', 'MEMBER'])
];
