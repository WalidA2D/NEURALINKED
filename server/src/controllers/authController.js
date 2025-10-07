import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';

// Inscription utilisateur
export const register = async (req, res) => {
    try {
        const { pseudo, email, mot_de_passe } = req.body;

        // Validation des champs requis
        if (!pseudo || !email || !mot_de_passe) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont obligatoires'
            });
        }

        // Vérifier si l'utilisateur existe déjà
        const [existingUsers] = await db.execute(
            'SELECT id FROM Utilisateur WHERE pseudo = ? OR email = ?',
            [pseudo, email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Un utilisateur avec ce pseudo ou email existe déjà'
            });
        }

        // Hasher le mot de passe
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(mot_de_passe, saltRounds);

        // Insérer le nouvel utilisateur
        const [result] = await db.execute(
            'INSERT INTO Utilisateur (pseudo, email, mot_de_passe) VALUES (?, ?, ?)',
            [pseudo, email, hashedPassword]
        );

        // Générer le token JWT
        const token = jwt.sign(
            { userId: result.insertId, pseudo },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Utilisateur créé avec succès',
            data: {
                id: result.insertId,
                pseudo,
                email,
                token
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors de l\'inscription:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'inscription'
        });
    }
};

// Connexion utilisateur
export const login = async (req, res) => {
    try {
        const { identifiant, mot_de_passe } = req.body;

        // Validation des champs
        if (!identifiant || !mot_de_passe) {
            return res.status(400).json({
                success: false,
                message: 'Identifiant et mot de passe requis'
            });
        }

        // Chercher l'utilisateur par pseudo ou email
        const [users] = await db.execute(
            'SELECT * FROM Utilisateur WHERE pseudo = ? OR email = ?',
            [identifiant, identifiant]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Identifiant ou mot de passe incorrect'
            });
        }

        const user = users[0];

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Identifiant ou mot de passe incorrect'
            });
        }

        // Mettre à jour la dernière connexion
        await db.execute(
            'UPDATE Utilisateur SET derniere_connexion = NOW() WHERE id = ?',
            [user.id]
        );

        // Générer le token JWT
        const token = jwt.sign(
            { userId: user.id, pseudo: user.pseudo },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Connexion réussie',
            data: {
                id: user.id,
                pseudo: user.pseudo,
                email: user.email,
                date_creation: user.date_creation,
                derniere_connexion: user.derniere_connexion,
                token
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors de la connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la connexion'
        });
    }
};

// Récupérer le profil utilisateur
export const getProfile = async (req, res) => {
    try {
        const userId = req.userId;

        const [users] = await db.execute(
            'SELECT id, pseudo, email, date_creation, derniere_connexion FROM Utilisateur WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            data: users[0]
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération du profil:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};