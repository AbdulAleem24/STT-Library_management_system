import { listAccounts, payFine } from '../services/accountService.js';
import { successResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const index = async (req, res, next) => {
  try {
    const { borrower } = req.query;
    const resolvedBorrower = borrower ? Number(borrower) : undefined;

    if (req.user.role !== 'ADMIN') {
      if (resolvedBorrower && resolvedBorrower !== req.user.id) {
        throw new ApiError(403, 'Members can only view their own accounts');
      }
      const accounts = await listAccounts({ borrower: req.user.id });
      return successResponse(res, { data: accounts });
    }

    const accounts = await listAccounts({ borrower: resolvedBorrower });
    return successResponse(res, { data: accounts });
  } catch (error) {
    return next(error);
  }
};

export const pay = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Only staff can record payments');
    }
    const accountLine = await payFine({
      accountLineId: Number(req.params.id),
      amount: Number(req.body.amount),
      paymentType: req.body.payment_type,
      managerId: req.user?.id
    });
    return successResponse(res, { message: 'Payment recorded', data: accountLine });
  } catch (error) {
    return next(error);
  }
};