import { registerUser, loginUser, getProfile } from '../services/authService.js';
import { successResponse } from '../utils/apiResponse.js';
import { generateToken } from '../utils/token.js';

export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    const token = generateToken({ id: user.borrowernumber, role: user.role });
    return successResponse(res, {
      status: 201,
      message: 'Registration successful',
      data: { user, token }
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const user = await loginUser(req.body);
    const token = generateToken({ id: user.borrowernumber, role: user.role });
    return successResponse(res, {
      message: 'Login successful',
      data: { user, token }
    });
  } catch (error) {
    return next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const profile = await getProfile(req.user.id);
    return successResponse(res, { data: profile });
  } catch (error) {
    return next(error);
  }
};
