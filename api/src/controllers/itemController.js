import { listItems, getItem, createItem, updateItem, deleteItem } from '../services/itemService.js';
import { successResponse } from '../utils/apiResponse.js';

export const index = async (req, res, next) => {
  try {
    const { page, limit, status, search } = req.query;
    const result = await listItems({ page, limit, status, search });
    return successResponse(res, { data: result.data, meta: result.meta });
  } catch (error) {
    return next(error);
  }
};

export const show = async (req, res, next) => {
  try {
    const item = await getItem(Number(req.params.id));
    return successResponse(res, { data: item });
  } catch (error) {
    return next(error);
  }
};

export const store = async (req, res, next) => {
  try {
    const item = await createItem(req.body);
    return successResponse(res, {
      status: 201,
      message: 'Item created',
      data: item
    });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const item = await updateItem(Number(req.params.id), req.body);
    return successResponse(res, { message: 'Item updated', data: item });
  } catch (error) {
    return next(error);
  }
};

export const destroy = async (req, res, next) => {
  try {
    await deleteItem(Number(req.params.id));
    return successResponse(res, { message: 'Item deleted' });
  } catch (error) {
    return next(error);
  }
};
