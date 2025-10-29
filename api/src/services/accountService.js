import prisma from '../prisma.js';
import { ApiError } from '../utils/apiError.js';

export const listAccounts = async ({ borrower }) => {
  const where = borrower ? { borrowernumber: borrower } : undefined;
  return prisma.accountLine.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: {
      borrower: { select: { borrowernumber: true, full_name: true } },
      item: { select: { itemnumber: true, barcode: true } }
    }
  });
};

export const payFine = async ({ accountLineId, amount, paymentType, managerId }) => {
  return prisma.$transaction(async (tx) => {
    const account = await tx.accountLine.findUnique({
      where: { accountlines_id: accountLineId }
    });

    if (!account) {
      throw new ApiError(404, 'Account line not found');
    }

    if (account.amountoutstanding <= 0) {
      throw new ApiError(400, 'Nothing outstanding to pay');
    }

    const newOutstanding = Number((account.amountoutstanding - amount).toFixed(2));
    if (newOutstanding < 0) {
      throw new ApiError(400, 'Payment exceeds outstanding amount');
    }

    const updated = await tx.accountLine.update({
      where: { accountlines_id: accountLineId },
      data: {
        amountoutstanding: newOutstanding,
        payment_type: paymentType,
        status: newOutstanding === 0 ? 'paid' : 'partially_paid',
        manager_id: managerId ?? account.manager_id,
        note: account.note ? `${account.note}\nPayment recorded` : 'Payment recorded'
      }
    });

    return updated;
  });
};
