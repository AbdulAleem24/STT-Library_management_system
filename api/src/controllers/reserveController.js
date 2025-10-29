import { listReserves, createReserve, cancelReserve } from '../services/reserveService.js';
import { successResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const index = async (req, res, next) => {
  try {
    const { page, limit, borrower } = req.query;
    const resolvedBorrower = borrower ? Number(borrower) : undefined;
    if (req.user.role !== 'ADMIN' && resolvedBorrower && resolvedBorrower !== req.user.id) {
      throw new ApiError(403, 'Members can only view their own holds');
    }
    const effectiveBorrower = req.user.role === 'ADMIN' ? resolvedBorrower : req.user.id;
    const result = await listReserves({ page, limit, borrower: effectiveBorrower });
    return successResponse(res, { data: result.data, meta: result.meta });
  } catch (error) {
    return next(error);
  }
};

export const store = async (req, res, next) => {
  try {
    const reserve = await createReserve(req.body, req.user);
    return successResponse(res, {
      status: 201,
      message: 'Hold created',
      data: reserve
    });
  } catch (error) {
    return next(error);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const reserve = await cancelReserve(Number(req.params.id), req.user);
    return successResponse(res, { message: 'Hold cancelled', data: reserve });
  } catch (error) {
    return next(error);
  }
};
