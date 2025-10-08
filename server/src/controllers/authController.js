import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '24h' });
}

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { pseudo, email, mot_de_passe } = req.body;
    if (!pseudo || !email || !mot_de_passe) {
      return res.status(400).json({ success:false, message:'Tous les champs sont obligatoires' });
    }

    // existe déjà ?
    const { data: exists, error: exErr } = await supabase
      .from('utilisateur') // 👈 minuscule
      .select('id')
      .or(`pseudo.eq.${pseudo},email.eq.${email}`)
      .limit(1);
    if (exErr) throw exErr;
    if (exists?.length) {
      return res.status(409).json({ success:false, message:'Un utilisateur avec ce pseudo ou email existe déjà' });
    }

    const hashed = await bcrypt.hash(mot_de_passe, 12);

    const { data: inserted, error: insErr } = await supabase
      .from('utilisateur')
      .insert([{ pseudo, email, mot_de_passe: hashed }])
      .select('id,pseudo,email,date_creation')
      .single();
    if (insErr) throw insErr;

    const token = signToken({ userId: inserted.id, pseudo: inserted.pseudo });
    res.status(201).json({ success:true, message:'Utilisateur créé avec succès', data: { ...inserted, token } });
  } catch (error) {
    console.error('❌ Register (supabase-js):', error);
    // si contraintes uniques en base -> code "23505" côté SQL ; via supabase-js l’erreur est textuelle
    return res.status(500).json({ success:false, message:"Erreur serveur lors de l'inscription" });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { identifiant, mot_de_passe } = req.body;
    if (!identifiant || !mot_de_passe) {
      return res.status(400).json({ success:false, message:'Identifiant et mot de passe requis' });
    }

    const { data: users, error } = await supabase
      .from('utilisateur')
      .select('id,pseudo,email,mot_de_passe,date_creation,derniere_connexion')
      .or(`pseudo.eq.${identifiant},email.eq.${identifiant}`)
      .limit(1);
    if (error) throw error;
    if (!users?.length) {
      return res.status(401).json({ success:false, message:'Identifiant ou mot de passe incorrect' });
    }

    const user = users[0];
    const ok = await bcrypt.compare(mot_de_passe, user.mot_de_passe || '');
    if (!ok) return res.status(401).json({ success:false, message:'Identifiant ou mot de passe incorrect' });

    const { data: up, error: upErr } = await supabase
      .from('utilisateur')
      .update({ derniere_connexion: new Date().toISOString() })
      .eq('id', user.id)
      .select('derniere_connexion')
      .single();
    if (upErr) throw upErr;

    const token = signToken({ userId: user.id, pseudo: user.pseudo });
    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        date_creation: user.date_creation,
        derniere_connexion: up?.derniere_connexion ?? user.derniere_connexion,
        token,
      },
    });
  } catch (error) {
    console.error('❌ Login (supabase-js):', error);
    res.status(500).json({ success:false, message:'Erreur serveur lors de la connexion' });
  }
};

// GET /api/auth/profile (protégée)
export const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('utilisateur')
      .select('id,pseudo,email,date_creation,derniere_connexion')
      .eq('id', userId)
      .single();
    if (error?.code === 'PGRST116') {
      return res.status(404).json({ success:false, message:'Utilisateur non trouvé' });
    }
    if (error) throw error;

    res.json({ success:true, data });
  } catch (error) {
    console.error('❌ Profile (supabase-js):', error);
    res.status(500).json({ success:false, message:'Erreur serveur' });
  }
};
