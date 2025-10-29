import { listPreferences, updatePreference } from '../services/systemPreferenceService.js';
import { successResponse } from '../utils/apiResponse.js';

export const index = async (_req, res, next) => {
  try {
    const prefs = await listPreferences();
    return successResponse(res, { data: prefs });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const pref = await updatePreference(req.params.variable, req.body);
    return successResponse(res, { message: 'Preference updated', data: pref });
  } catch (error) {
    return next(error);
  }
};
