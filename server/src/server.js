import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Serveur Neuralinked en fonctionnement',
        timestamp: new Date().toISOString()
    });
});

// Route 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée'
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur Neuralinked démarré sur le port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});