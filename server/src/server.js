// server/src/serveur.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'Serveur Neuralinked en fonctionnement',
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvée' });
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Serveur Neuralinked démarré sur le port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});
