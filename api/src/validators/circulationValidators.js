import { body, query } from 'express-validator';

export const checkoutValidator = [
  body('borrowernumber').isInt().withMessage('Borrower id is required'),
  body('itemnumber').optional().isInt(),
  body('barcode').optional().isString(),
  body().custom((value) => {
    if (!value.itemnumber && !value.barcode) {
      throw new Error('Either itemnumber or barcode is required');
    }
    return true;
  })
];

export const returnValidator = [
  body('issueId').optional().isInt(),
  body('itemnumber').optional().isInt(),
  body('barcode').optional().isString(),
  body().custom((value) => {
    if (!value.issueId && !value.itemnumber && !value.barcode) {
      throw new Error('Provide issueId, itemnumber, or barcode');
    }
    return true;
  })
];

export const renewValidator = [
  body('issueId').isInt().withMessage('issueId is required')
];

export const historyValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('issuedFrom').optional().isISO8601(),
  query('issuedTo').optional().isISO8601(),
  query('returnedFrom').optional().isISO8601(),
  query('returnedTo').optional().isISO8601()
];
