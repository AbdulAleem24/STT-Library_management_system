import {
  listBiblios,
  getBiblio,
  createBiblio,
  updateBiblio,
  deleteBiblio
} from '../services/biblioService.js';
import { successResponse } from '../utils/apiResponse.js';

export const index = async (req, res, next) => {
  try {
    const { page, limit, search, itemtype } = req.query;
    const result = await listBiblios({ page, limit, search, itemtype });
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
    const record = await getBiblio(Number(req.params.id));
    return successResponse(res, { data: record });
  } catch (error) {
    return next(error);
  }
};

export const store = async (req, res, next) => {
  try {
    const record = await createBiblio(req.body);
    return successResponse(res, {
      status: 201,
      message: 'Bibliographic record created',
      data: record
    });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const record = await updateBiblio(Number(req.params.id), req.body);
    return successResponse(res, { message: 'Bibliographic record updated', data: record });
  } catch (error) {
    return next(error);
  }
};

export const destroy = async (req, res, next) => {
  try {
    await deleteBiblio(Number(req.params.id));
    return successResponse(res, { message: 'Bibliographic record deleted' });
  } catch (error) {
    return next(error);
  }
};
