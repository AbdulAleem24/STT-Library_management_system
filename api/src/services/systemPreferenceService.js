import prisma from '../prisma.js';
import { ApiError } from '../utils/apiError.js';

export const listPreferences = async () => {
  return prisma.systemPreference.findMany({ orderBy: { variable: 'asc' } });
};

export const updatePreference = async (variable, data) => {
  try {
    return await prisma.systemPreference.update({
      where: { variable },
      data: {
        value: data.value,
        explanation: data.explanation,
        type: data.type,
        updated_at: new Date()
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new ApiError(404, 'Preference not found');
    }
    throw error;
  }
};
