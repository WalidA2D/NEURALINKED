// server/src/routes/authRoutes.js
import express from 'express';
import { register, login, getProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/ping', (_req, res) => res.json({ ok: true, where: '/api/auth/ping' }));

// publiques
router.post('/register', register);
router.post('/login', login);

// protégée
router.get('/profile', authenticateToken, getProfile);

export default router;
