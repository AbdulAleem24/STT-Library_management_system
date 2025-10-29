import { body } from 'express-validator';

export const registerValidator = [
  body('cardnumber').isString().isLength({ min: 3 }).withMessage('Card number must be at least 3 characters'),
  body('fullName').isString().trim().notEmpty().withMessage('Full name is required'),
  body('email').optional().isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('categorycode').optional().isString().withMessage('Category code must be a string'),
  body('role').optional().isIn(['ADMIN', 'MEMBER']).withMessage('Invalid role')
];

export const loginValidator = [
  body('email').optional().isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('cardnumber').optional().isString().withMessage('Card number must be a string'),
  body('password').isString().withMessage('Password is required'),
  body().custom((value) => {
    if (!value.email && !value.cardnumber) {
      throw new Error('Either email or cardnumber is required');
    }
    return true;
  })
];
