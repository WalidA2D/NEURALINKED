// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './src/routes/authRoutes.js';
import { query } from './src/config/database.js';
import { supabase } from './src/config/supabase.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use((req, _res, next) => {
  console.log('➡️', req.method, req.originalUrl);
  next();
});


// Health API
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'Serveur Neuralinked en fonctionnement',
    timestamp: new Date().toISOString(),
  });
});

// Health DB
app.get('/api/health/db', async (_req, res) => {
  try {
    const { rows } = await query('select now() as now');
    res.json({ ok: true, now: rows[0].now });
  } catch (e) {
    console.error('DB health error:', e);
    res.status(500).json({ ok: false, error: 'DB not reachable' });
  }
});

app.get('/api/health/supabase', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('utilisateur') // respecte bien la casse de ta table
      .select('id')
      .limit(1);
    if (error) throw error;
    res.json({ ok: true, rows: data?.length ?? 0 });
  } catch (e) {
    console.error('Supabase health error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === Tes routes d'auth ===
app.use('/api/auth', authRoutes);

app.post('/api/auth/register', (req, res) => {
  return res.json({ ok: true, echo: req.body || null, from: 'inline route' });
});


// GET /api/users?pseudo=...&email=...
app.get('/api/users', async (req, res) => {
  try {
    const { pseudo, email } = req.query;
    let q = supabase.from('utilisateur').select('id,pseudo,email,date_creation,derniere_connexion');

    if (pseudo) q = q.eq('pseudo', pseudo);
    if (email) q = q.eq('email', email);

    const { data, error } = await q.order('id', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 404 (Express 5 : pas de '*')
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvée' });
});

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
