import { validationResult } from 'express-validator';
import { ApiError } from '../utils/apiError.js';

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return next(new ApiError(422, 'Validation failed', errors.array()));
  };
};

export default validate;
