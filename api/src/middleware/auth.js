import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import prisma from '../prisma.js';
import { ApiError } from '../utils/apiError.js';

export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token missing');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    const borrower = await prisma.borrower.findUnique({
      where: { borrowernumber: decoded.id },
      select: {
        borrowernumber: true,
        full_name: true,
        email: true,
        role: true,
        categorycode: true
      }
    });

    if (!borrower) {
      throw new ApiError(401, 'Invalid token subject');
    }

    req.user = {
      id: borrower.borrowernumber,
      name: borrower.full_name,
      email: borrower.email,
      role: borrower.role,
      categorycode: borrower.categorycode
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Invalid or expired token'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }

    next();
  };
};

export default authenticate;
