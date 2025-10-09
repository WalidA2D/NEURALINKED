import { supabase } from '../config/supabase.js';
import { generateRoomCode } from '../utils/room.js';

// Créer une nouvelle partie
export const createRoom = async (req, res) => {
    try {
        const { userId } = req;
        const { password } = req.body;

        // Vérifier que l'utilisateur existe
        const { data: users, error: userErr } = await supabase
            .from('utilisateur')
            .select('id, pseudo')
            .eq('id', userId)
            .single();

        if (userErr || !users) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Générer un code unique
        let code;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            code = generateRoomCode();
            const { data: existing, error: codeErr } = await supabase
                .from('partie')
                .select('id')
                .eq('code', code)
                .limit(1);

            if (codeErr) throw codeErr;
            if (!existing || existing.length === 0) {
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
        const { data: newPartie, error: partieErr } = await supabase
            .from('partie')
            .insert([{
                code: code,
                statut: 'waiting',
                date_creation: new Date().toISOString()
            }])
            .select('id, code, statut, date_creation')
            .single();

        if (partieErr) throw partieErr;

        // Ajouter l'utilisateur comme hôte
        const { error: jpErr } = await supabase
            .from('joueur_partie')
            .insert([{
                id_partie: newPartie.id,
                id_utilisateur: userId,
                role: 'host',
                est_connecte: true
            }]);

        if (jpErr) throw jpErr;

        res.status(201).json({
            success: true,
            message: 'Partie créée avec succès',
            data: {
                roomId: newPartie.id,
                code: newPartie.code,
                host: {
                    id: users.id,
                    pseudo: users.pseudo
                },
                players: [{
                    id: users.id,
                    pseudo: users.pseudo,
                    role: 'host',
                    isConnected: true
                }],
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
        const { data: users, error: userErr } = await supabase
            .from('utilisateur')
            .select('id, pseudo')
            .eq('id', userId)
            .single();

        if (userErr || !users) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier que la partie existe et compter les joueurs
        const { data: partie, error: partieErr } = await supabase
            .from('partie')
            .select('id, code, statut, date_creation')
            .eq('code', code.toUpperCase())
            .eq('statut', 'waiting')
            .single();

        if (partieErr || !partie) {
            return res.status(404).json({
                success: false,
                message: 'Partie non trouvée ou déjà commencée'
            });
        }

        // Compter le nombre de joueurs
        const { count: nbJoueurs, error: countErr } = await supabase
            .from('joueur_partie')
            .select('*', { count: 'exact', head: true })
            .eq('id_partie', partie.id);

        if (countErr) throw countErr;

        // Vérifier le nombre de joueurs (max 5)
        if (nbJoueurs >= 5) {
            return res.status(400).json({
                success: false,
                message: 'La partie est pleine (5 joueurs maximum)'
            });
        }

        // Vérifier si l'utilisateur est déjà dans la partie
        const { data: existingPlayer, error: existErr } = await supabase
            .from('joueur_partie')
            .select('id')
            .eq('id_partie', partie.id)
            .eq('id_utilisateur', userId)
            .limit(1);

        if (existErr) throw existErr;

        if (existingPlayer && existingPlayer.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Vous êtes déjà dans cette partie'
            });
        }

        // Ajouter le joueur à la partie
        const { error: insertErr } = await supabase
            .from('joueur_partie')
            .insert([{
                id_partie: partie.id,
                id_utilisateur: userId,
                role: 'player',
                est_connecte: true
            }]);

        if (insertErr) throw insertErr;

        // Récupérer la liste des joueurs
        const { data: players, error: playersErr } = await supabase
            .from('joueur_partie')
            .select(`
        role,
        est_connecte,
        utilisateur:id_utilisateur (
          id,
          pseudo
        )
      `)
            .eq('id_partie', partie.id);

        if (playersErr) throw playersErr;

        // Formater les joueurs
        const formattedPlayers = players.map(p => ({
            id: p.utilisateur.id,
            pseudo: p.utilisateur.pseudo,
            role: p.role,
            est_connecte: p.est_connecte
        }));

        // Récupérer l'hôte
        const host = formattedPlayers.find(p => p.role === 'host');

        res.json({
            success: true,
            message: 'Partie rejointe avec succès',
            data: {
                roomId: partie.id,
                code: partie.code,
                host: host,
                players: formattedPlayers,
                status: partie.statut,
                currentPlayers: formattedPlayers.length,
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
export const startRoom = async (req, res) => {
    try {
        const { userId } = req;
        const { roomId } = req.params;

        console.log(`🔄 Tentative de démarrage de la partie ${roomId} par l'utilisateur ${userId}`);

        // Vérifier que l'utilisateur est l'hôte de la partie
        const { data: hostCheck, error: hostErr } = await supabase
            .from('joueur_partie')
            .select(`
        role,
        partie:id_partie (
          statut
        )
      `)
            .eq('id_partie', roomId)
            .eq('id_utilisateur', userId)
            .single();

        if (hostErr || !hostCheck) {
            return res.status(404).json({
                success: false,
                message: 'Partie non trouvée'
            });
        }

        if (hostCheck.role !== 'host') {
            return res.status(403).json({
                success: false,
                message: 'Seul l\'hôte peut démarrer la partie'
            });
        }

        if (hostCheck.partie.statut !== 'waiting') {
            return res.status(400).json({
                success: false,
                message: 'La partie a déjà commencé'
            });
        }

        // Compter le nombre de joueurs
        const { count: nbJoueurs, error: countErr } = await supabase
            .from('joueur_partie')
            .select('*', { count: 'exact', head: true })
            .eq('id_partie', roomId);

        if (countErr) throw countErr;

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
        const { error: updateErr } = await supabase
            .from('partie')
            .update({
                statut: 'playing',
                date_debut: new Date().toISOString()
            })
            .eq('id', roomId);

        if (updateErr) throw updateErr;

        console.log(`✅ Statut de la partie ${roomId} mis à jour vers 'playing'`);

        // ESSAYER d'initialiser la progression, mais ne pas bloquer si ça échoue
        try {
            const { error: progErr } = await supabase
                .from('progression')
                .insert([{
                    id_partie: roomId,
                    id_enigme: 1,
                    resolue: false,
                    tentatives: 0
                }]);

            if (progErr) {
                console.warn('⚠️ Impossible de créer la progression, mais la partie continue:', progErr);
                // On continue même si la progression échoue
            } else {
                console.log('✅ Progression initialisée pour la partie', roomId);
            }
        } catch (progError) {
            console.warn('⚠️ Erreur lors de la création de la progression:', progError);
            // On continue quand même
        }

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

        // Récupérer la partie
        const { data: partie, error: partieErr } = await supabase
            .from('partie')
            .select('id, code, statut, date_creation, date_debut')
            .eq('code', code.toUpperCase())
            .single();

        if (partieErr || !partie) {
            return res.status(404).json({
                success: false,
                message: 'Partie non trouvée'
            });
        }

        // Récupérer les joueurs
        const { data: players, error: playersErr } = await supabase
            .from('joueur_partie')
            .select(`
        role,
        est_connecte,
        utilisateur:id_utilisateur (
          id,
          pseudo
        )
      `)
            .eq('id_partie', partie.id);

        if (playersErr) throw playersErr;

        // Formater les joueurs
        const formattedPlayers = players.map(p => ({
            id: p.utilisateur.id,
            pseudo: p.utilisateur.pseudo,
            role: p.role,
            est_connecte: p.est_connecte
        }));

        // Récupérer l'hôte
        const host = formattedPlayers.find(p => p.role === 'host');

        res.json({
            success: true,
            data: {
                roomId: partie.id,
                code: partie.code,
                status: partie.statut,
                host: host,
                players: formattedPlayers,
                currentPlayers: formattedPlayers.length,
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
        const { data: playerCheck, error: checkErr } = await supabase
            .from('joueur_partie')
            .select('role')
            .eq('id_partie', roomId)
            .eq('id_utilisateur', userId)
            .single();

        if (checkErr || !playerCheck) {
            return res.status(404).json({
                success: false,
                message: 'Vous n\'êtes pas dans cette partie'
            });
        }

        // Si c'est l'hôte, transférer l'hôte à un autre joueur ou supprimer la partie
        if (playerCheck.role === 'host') {
            // Chercher un autre joueur pour devenir hôte
            const { data: otherPlayers, error: otherErr } = await supabase
                .from('joueur_partie')
                .select('id_utilisateur')
                .eq('id_partie', roomId)
                .neq('id_utilisateur', userId)
                .limit(1);

            if (otherErr) throw otherErr;

            if (otherPlayers && otherPlayers.length > 0) {
                // Transférer l'hôte
                const { error: transferErr } = await supabase
                    .from('joueur_partie')
                    .update({ role: 'host' })
                    .eq('id_partie', roomId)
                    .eq('id_utilisateur', otherPlayers[0].id_utilisateur);

                if (transferErr) throw transferErr;
            } else {
                // Supprimer la partie si c'est le dernier joueur
                const { error: deleteErr } = await supabase
                    .from('partie')
                    .delete()
                    .eq('id', roomId);

                if (deleteErr) throw deleteErr;

                return res.json({
                    success: true,
                    message: 'Partie supprimée (dernier joueur)'
                });
            }
        }

        // Retirer le joueur de la partie
        const { error: removeErr } = await supabase
            .from('joueur_partie')
            .delete()
            .eq('id_partie', roomId)
            .eq('id_utilisateur', userId);

        if (removeErr) throw removeErr;

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