export const successResponse = (res, { status = 200, message = 'OK', data = null, meta = undefined }) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    meta
  });
};

export const errorResponse = (res, { status = 500, message = 'Something went wrong', errors = undefined }) => {
  return res.status(status).json({
    success: false,
    message,
    errors
  });
};

export default successResponse;
