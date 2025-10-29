import { checkoutItem, returnItem, renewItem, listCirculationHistory } from '../services/circulationService.js';
import { successResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const checkout = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.body.borrowernumber !== req.user.id) {
      throw new ApiError(403, 'Members can only checkout items for themselves');
    }
    const issue = await checkoutItem(req.body, req.user);
    return successResponse(res, {
      status: 201,
      message: 'Checkout successful',
      data: issue
    });
  } catch (error) {
    return next(error);
  }
};

export const processReturn = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MEMBER') {
      throw new ApiError(403, 'Unauthorized');
    }
    const issue = await returnItem(req.body, req.user);
    return successResponse(res, {
      message: 'Return processed',
      data: issue
    });
  } catch (error) {
    return next(error);
  }
};

export const renew = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MEMBER') {
      throw new ApiError(403, 'Unauthorized');
    }
    const issue = await renewItem(req.body, req.user);
    return successResponse(res, {
      message: 'Renewal successful',
      data: issue
    });
  } catch (error) {
    return next(error);
  }
};

export const history = async (req, res, next) => {
  try {
    const { page, limit, issuedFrom, issuedTo, returnedFrom, returnedTo } = req.query;

    if (issuedFrom && issuedTo && new Date(issuedFrom) > new Date(issuedTo)) {
      throw new ApiError(400, 'issuedFrom must be before issuedTo');
    }

    if (returnedFrom && returnedTo && new Date(returnedFrom) > new Date(returnedTo)) {
      throw new ApiError(400, 'returnedFrom must be before returnedTo');
    }

    const result = await listCirculationHistory({
      page,
      limit,
      issuedFrom,
      issuedTo,
      returnedFrom,
      returnedTo
    });

    return successResponse(res, {
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    return next(error);
  }
};
