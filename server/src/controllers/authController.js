// server/src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '24h' });
}

/**
 * POST /api/auth/register
 * body: { pseudo, email, mot_de_passe }
 */
export const register = async (req, res) => {
  try {
    const { pseudo, email, mot_de_passe } = req.body;

    if (!pseudo || !email || !mot_de_passe) {
      return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires' });
    }

    // existe déjà ?
    const exists = await query(
      `select id from public."Utilisateur" where pseudo = $1 or email = $2 limit 1`,
      [pseudo, email]
    );
    if (exists.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Un utilisateur avec ce pseudo ou email existe déjà',
      });
    }

    const hashed = await bcrypt.hash(mot_de_passe, 12);

    const inserted = await query(
      `insert into public."Utilisateur" (pseudo, email, mot_de_passe)
       values ($1, $2, $3)
       returning id, pseudo, email, date_creation`,
      [pseudo, email, hashed]
    );
    const user = inserted.rows[0];

    const token = signToken({ userId: user.id, pseudo: user.pseudo });

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: { ...user, token },
    });
  } catch (error) {
    console.error('❌ Erreur lors de l’inscription:', error);
    if (error?.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Pseudo ou email déjà utilisé',
      });
    }
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'inscription" });
  }
};

/**
 * POST /api/auth/login
 * body: { identifiant, mot_de_passe }
 */
export const login = async (req, res) => {
  try {
    const { identifiant, mot_de_passe } = req.body;

    if (!identifiant || !mot_de_passe) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant et mot de passe requis',
      });
    }

    const found = await query(
      `select id, pseudo, email, mot_de_passe, date_creation, derniere_connexion
       from public."Utilisateur"
       where pseudo = $1 or email = $1
       limit 1`,
      [identifiant]
    );
    if (found.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Identifiant ou mot de passe incorrect' });
    }

    const user = found.rows[0];
    const ok = await bcrypt.compare(mot_de_passe, user.mot_de_passe || '');
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Identifiant ou mot de passe incorrect' });
    }

    // mets à jour et récupère la nouvelle valeur
    const up = await query(
      `update public."Utilisateur" set derniere_connexion = now()
       where id = $1
       returning derniere_connexion`,
      [user.id]
    );

    const token = signToken({ userId: user.id, pseudo: user.pseudo });

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        date_creation: user.date_creation,
        derniere_connexion: up.rows[0]?.derniere_connexion ?? user.derniere_connexion,
        token,
      },
    });
  } catch (error) {
    console.error('❌ Erreur lors de la connexion:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la connexion' });
  }
};

/**
 * GET /api/auth/profile
 * headers: Authorization: Bearer <token>
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await query(
      `select id, pseudo, email, date_creation, derniere_connexion
       from public."Utilisateur"
       where id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du profil:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};