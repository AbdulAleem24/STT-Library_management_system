import { body, param } from 'express-validator';

export const updatePreferenceValidator = [
  param('variable').isString().withMessage('Preference variable is required'),
  body('value').optional().isString(),
  body('explanation').optional().isString(),
  body('type').optional().isString()
];
