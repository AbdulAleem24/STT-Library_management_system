import { errorResponse } from '../utils/apiResponse.js';

export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const errors = err.details || undefined;

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  return errorResponse(res, { status: statusCode, message, errors });
};

export default errorHandler;
