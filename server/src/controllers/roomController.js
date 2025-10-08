import { db } from '../config/database.js';
import { generateRoomCode } from '../utils/room.js';

// Créer une nouvelle partie
export const createRoom = async (req, res) => {
    try {
        const { userId } = req; // Récupéré du middleware d'authentification
        const { password } = req.body;

        // Vérifier que l'utilisateur existe
        const [users] = await db.execute(
            'SELECT id, pseudo FROM Utilisateur WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const user = users[0];

        // Générer un code unique
        let code;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            code = generateRoomCode();
            const [existing] = await db.execute(
                'SELECT id FROM Partie WHERE code = ?',
                [code]
            );
            if (existing.length === 0) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({
                success: false,
                message: 'Impossible de générer un code de partie unique'
            });
        }

        // Créer la partie
        const [result] = await db.execute(
            'INSERT INTO Partie (code, statut, date_creation) VALUES (?, "waiting", NOW())',
            [code]
        );

        const partieId = result.insertId;

        // Ajouter l'utilisateur comme hôte
        await db.execute(
            'INSERT INTO JoueurPartie (id_partie, id_utilisateur, role, est_connecte) VALUES (?, ?, "host", TRUE)',
            [partieId, userId]
        );

        res.status(201).json({
            success: true,
            message: 'Partie créée avec succès',
            data: {
                roomId: partieId,
                code: code,
                host: {
                    id: user.id,
                    pseudo: user.pseudo
                },
                players: [
                    {
                        id: user.id,
                        pseudo: user.pseudo,
                        role: 'host',
                        isConnected: true
                    }
                ],
                status: 'waiting',
                password: password || null
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors de la création de la partie:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la création de la partie'
        });
    }
};

// Rejoindre une partie
export const joinRoom = async (req, res) => {
    try {
        const { userId } = req;
        const { code, password } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Code de partie requis'
            });
        }

        // Vérifier que l'utilisateur existe
        const [users] = await db.execute(
            'SELECT id, pseudo FROM Utilisateur WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const user = users[0];

        // Vérifier que la partie existe
        const [parties] = await db.execute(
            `SELECT p.*, COUNT(jp.id) as nb_joueurs 
       FROM Partie p 
       LEFT JOIN JoueurPartie jp ON p.id = jp.id_partie 
       WHERE p.code = ? AND p.statut = "waiting"
       GROUP BY p.id`,
            [code.toUpperCase()]
        );

        if (parties.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Partie non trouvée ou déjà commencée'
            });
        }

        const partie = parties[0];

        // Vérifier le nombre de joueurs (max 5)
        if (partie.nb_joueurs >= 5) {
            return res.status(400).json({
                success: false,
                message: 'La partie est pleine (5 joueurs maximum)'
            });
        }

        // Vérifier si l'utilisateur est déjà dans la partie
        const [existingPlayer] = await db.execute(
            'SELECT id FROM JoueurPartie WHERE id_partie = ? AND id_utilisateur = ?',
            [partie.id, userId]
        );

        if (existingPlayer.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Vous êtes déjà dans cette partie'
            });
        }

        // Ajouter le joueur à la partie
        await db.execute(
            'INSERT INTO JoueurPartie (id_partie, id_utilisateur, role, est_connecte) VALUES (?, ?, "player", TRUE)',
            [partie.id, userId]
        );

        // Récupérer la liste des joueurs
        const [players] = await db.execute(
            `SELECT u.id, u.pseudo, jp.role, jp.est_connecte 
       FROM JoueurPartie jp 
       JOIN Utilisateur u ON jp.id_utilisateur = u.id 
       WHERE jp.id_partie = ?`,
            [partie.id]
        );

        // Récupérer l'hôte
        const [hosts] = await db.execute(
            `SELECT u.id, u.pseudo 
       FROM JoueurPartie jp 
       JOIN Utilisateur u ON jp.id_utilisateur = u.id 
       WHERE jp.id_partie = ? AND jp.role = "host"`,
            [partie.id]
        );

        const host = hosts[0];

        res.json({
            success: true,
            message: 'Partie rejointe avec succès',
            data: {
                roomId: partie.id,
                code: partie.code,
                host: host,
                players: players,
                status: partie.statut,
                currentPlayers: players.length,
                maxPlayers: 5
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors de la jonction de la partie:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la jonction de la partie'
        });
    }
};

// Démarrer une partie
// Démarrer une partie - VERSION CORRIGÉE
export const startRoom = async (req, res) => {
    try {
        const { userId } = req;
        const { roomId } = req.params;

        console.log(`🔄 Tentative de démarrage de la partie ${roomId} par l'utilisateur ${userId}`);

        // Vérifier que l'utilisateur est l'hôte de la partie
        const [hostCheck] = await db.execute(
            `SELECT jp.role, p.statut
             FROM JoueurPartie jp
                      JOIN Partie p ON jp.id_partie = p.id
             WHERE jp.id_partie = ? AND jp.id_utilisateur = ?`,
            [roomId, userId]
        );

        if (hostCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Partie non trouvée'
            });
        }

        const check = hostCheck[0];

        if (check.role !== 'host') {
            return res.status(403).json({
                success: false,
                message: 'Seul l\'hôte peut démarrer la partie'
            });
        }

        if (check.statut !== 'waiting') {
            return res.status(400).json({
                success: false,
                message: 'La partie a déjà commencé'
            });
        }

        // ✅ CORRECTION : Compter correctement le nombre de joueurs
        const [playersCount] = await db.execute(
            'SELECT COUNT(*) as count FROM JoueurPartie WHERE id_partie = ?',
            [roomId]
        );

        const nbJoueurs = playersCount[0].count;

        console.log(`👥 Nombre de joueurs dans la partie: ${nbJoueurs}`);

        // Vérifier le nombre de joueurs (min 2, max 5)
        if (nbJoueurs < 2) {
            return res.status(400).json({
                success: false,
                message: `Minimum 2 joueurs requis pour démarrer (actuellement: ${nbJoueurs})`
            });
        }

        if (nbJoueurs > 5) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 5 joueurs autorisés'
            });
        }

        // Mettre à jour le statut de la partie
        await db.execute(
            'UPDATE Partie SET statut = "playing", date_debut = NOW() WHERE id = ?',
            [roomId]
        );

        // Initialiser la progression pour la première énigme
        await db.execute(
            'INSERT INTO Progression (id_partie, id_enigme, resolue, tentatives) VALUES (?, 1, FALSE, 0)',
            [roomId]
        );

        console.log(`✅ Partie ${roomId} démarrée avec succès avec ${nbJoueurs} joueurs`);

        res.json({
            success: true,
            message: 'Partie démarrée avec succès',
            data: {
                roomId: parseInt(roomId),
                status: 'playing',
                currentEnigma: 1,
                playersCount: nbJoueurs
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors du démarrage de la partie:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors du démarrage de la partie'
        });
    }
};

// Obtenir les informations d'une partie
export const getRoom = async (req, res) => {
    try {
        const { code } = req.params;

        const [parties] = await db.execute(
            `SELECT p.*, COUNT(jp.id) as nb_joueurs 
       FROM Partie p 
       LEFT JOIN JoueurPartie jp ON p.id = jp.id_partie 
       WHERE p.code = ?
       GROUP BY p.id`,
            [code.toUpperCase()]
        );

        if (parties.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Partie non trouvée'
            });
        }

        const partie = parties[0];

        // Récupérer les joueurs
        const [players] = await db.execute(
            `SELECT u.id, u.pseudo, jp.role, jp.est_connecte 
       FROM JoueurPartie jp 
       JOIN Utilisateur u ON jp.id_utilisateur = u.id 
       WHERE jp.id_partie = ?`,
            [partie.id]
        );

        // Récupérer l'hôte
        const [hosts] = await db.execute(
            `SELECT u.id, u.pseudo 
       FROM JoueurPartie jp 
       JOIN Utilisateur u ON jp.id_utilisateur = u.id 
       WHERE jp.id_partie = ? AND jp.role = "host"`,
            [partie.id]
        );

        const host = hosts[0];

        res.json({
            success: true,
            data: {
                roomId: partie.id,
                code: partie.code,
                status: partie.statut,
                host: host,
                players: players,
                currentPlayers: players.length,
                maxPlayers: 5,
                dateCreation: partie.date_creation,
                dateDebut: partie.date_debut
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération de la partie:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

// Quitter une partie
export const leaveRoom = async (req, res) => {
    try {
        const { userId } = req;
        const { roomId } = req.params;

        // Vérifier si l'utilisateur est dans la partie
        const [playerCheck] = await db.execute(
            'SELECT role FROM JoueurPartie WHERE id_partie = ? AND id_utilisateur = ?',
            [roomId, userId]
        );

        if (playerCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vous n\'êtes pas dans cette partie'
            });
        }

        const player = playerCheck[0];

        // Si c'est l'hôte, transférer l'hôte à un autre joueur ou supprimer la partie
        if (player.role === 'host') {
            // Chercher un autre joueur pour devenir hôte
            const [otherPlayers] = await db.execute(
                'SELECT id_utilisateur FROM JoueurPartie WHERE id_partie = ? AND id_utilisateur != ? LIMIT 1',
                [roomId, userId]
            );

            if (otherPlayers.length > 0) {
                // Transférer l'hôte
                await db.execute(
                    'UPDATE JoueurPartie SET role = "host" WHERE id_partie = ? AND id_utilisateur = ?',
                    [roomId, otherPlayers[0].id_utilisateur]
                );
            } else {
                // Supprimer la partie si c'est le dernier joueur
                await db.execute('DELETE FROM Partie WHERE id = ?', [roomId]);

                res.json({
                    success: true,
                    message: 'Partie supprimée (dernier joueur)'
                });
                return;
            }
        }

        // Retirer le joueur de la partie
        await db.execute(
            'DELETE FROM JoueurPartie WHERE id_partie = ? AND id_utilisateur = ?',
            [roomId, userId]
        );

        res.json({
            success: true,
            message: 'Partie quittée avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur lors de la sortie de la partie:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la sortie de la partie'
        });
    }
};