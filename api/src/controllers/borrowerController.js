import {
  listBorrowers,
  getBorrower,
  createBorrower,
  updateBorrower,
  deleteBorrower
} from '../services/borrowerService.js';
import { successResponse } from '../utils/apiResponse.js';

export const index = async (req, res, next) => {
  try {
    const { page, limit, search, sort } = req.query;
    const result = await listBorrowers({ page, limit, search, sort });
    return successResponse(res, {
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    return next(error);
  }
};

export const show = async (req, res, next) => {
  try {
    const borrower = await getBorrower(Number(req.params.id));
    return successResponse(res, { data: borrower });
  } catch (error) {
    return next(error);
  }
};

export const store = async (req, res, next) => {
  try {
    const borrower = await createBorrower(req.body);
    return successResponse(res, {
      status: 201,
      message: 'Borrower created',
      data: borrower
    });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const borrower = await updateBorrower(Number(req.params.id), req.body);
    return successResponse(res, { message: 'Borrower updated', data: borrower });
  } catch (error) {
    return next(error);
  }
};

export const destroy = async (req, res, next) => {
  try {
    await deleteBorrower(Number(req.params.id));
    return successResponse(res, { message: 'Borrower deleted' });
  } catch (error) {
    return next(error);
  }
};
