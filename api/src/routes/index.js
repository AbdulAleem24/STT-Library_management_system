import express from 'express';
import authRoutes from './authRoutes.js';
import borrowerRoutes from './borrowerRoutes.js';
import biblioRoutes from './biblioRoutes.js';
import itemRoutes from './itemRoutes.js';
import circulationRoutes from './circulationRoutes.js';
import reserveRoutes from './reserveRoutes.js';
import accountRoutes from './accountRoutes.js';
import systemPreferenceRoutes from './systemPreferenceRoutes.js';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Library API is healthy' });
});

router.use('/auth', authRoutes);
router.use('/borrowers', borrowerRoutes);
router.use('/biblio', biblioRoutes);
router.use('/items', itemRoutes);
router.use('/circulation', circulationRoutes);
router.use('/reserves', reserveRoutes);
router.use('/accounts', accountRoutes);
router.use('/system-preferences', systemPreferenceRoutes);

export default router;
