// server/src/routes/messageRoutes.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

// GET /api/messages/:roomId - Récupérer l'historique des messages
router.get('/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;

        console.log(`🔍 GET MESSAGES: Requête pour room ${roomId}`);

        const { data, error } = await supabase
            .from('Message')
            .select(`
        id,
        contenu,
        date_envoi,
        type_message,
        id_utilisateur,
        utilisateur!inner(pseudo)
      `)
            .eq('id_partie', roomId)
            .order('date_envoi', { ascending: true });

        if (error) {
            console.error('❌ GET MESSAGES: Erreur Supabase:', error);
            throw error;
        }

        // Transformer les données pour avoir un format plus simple
        const formattedMessages = data.map(msg => ({
            id: msg.id,
            user: msg.utilisateur?.pseudo || 'Anonyme',
            text: msg.contenu,
            ts: new Date(msg.date_envoi).getTime(),
            type: msg.type_message
        }));

        console.log(`✅ GET MESSAGES: ${formattedMessages.length} messages récupérés pour room ${roomId}`);

        res.json(formattedMessages);
    } catch (error) {
        console.error('❌ GET MESSAGES: Erreur récupération messages:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/messages - Envoyer un message (VERSION AVEC DEBUG)
router.post('/', async (req, res) => {
    try {
        const { id_partie, contenu, type_message = 'chat', user } = req.body;

        console.log('💬 NOUVEAU MESSAGE:', {
            id_partie,
            contenu: contenu?.substring(0, 100) + (contenu?.length > 100 ? '...' : ''),
            user,
            type_message
        });

        // Pour l'instant, on utilise le pseudo directement
        let id_utilisateur = null;

        // Recherche de l'utilisateur par pseudo (temporaire)
        if (user) {
            console.log(`🔍 RECHERCHE UTILISATEUR: "${user}"`);
            const { data: userData, error: userError } = await supabase
                .from('utilisateur')
                .select('id')
                .eq('pseudo', user)
                .single();

            if (userError) {
                console.error('❌ RECHERCHE UTILISATEUR: Erreur:', userError);
            } else {
                id_utilisateur = userData?.id || null;
                console.log(`✅ RECHERCHE UTILISATEUR: Trouvé - ID ${id_utilisateur}`);
            }
        }

        const messageData = {
            id_partie,
            id_utilisateur,
            contenu,
            type_message,
            date_envoi: new Date().toISOString()
        };

        console.log('💾 INSERTION MESSAGE:', messageData);

        const { data, error } = await supabase
            .from('Message')
            .insert([messageData])
            .select(`
        id,
        contenu,
        date_envoi,
        type_message,
        id_utilisateur,
        utilisateur!inner(pseudo)
      `)
            .single();

        if (error) {
            console.error('❌ INSERTION MESSAGE: Erreur Supabase:', error);
            throw error;
        }

        // Formater la réponse
        const formattedMessage = {
            id: data.id,
            user: data.utilisateur?.pseudo || user || 'Anonyme',
            text: data.contenu,
            ts: new Date(data.date_envoi).getTime(),
            type: data.type_message
        };

        console.log('✅ MESSAGE SAUVEGARDÉ:', {
            id: formattedMessage.id,
            user: formattedMessage.user,
            texte: formattedMessage.text.substring(0, 50) + '...'
        });

        res.status(201).json(formattedMessage);
    } catch (error) {
        console.error('❌ ERREUR SAUVEGARDE MESSAGE:', error);
        res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        });
    }
});

// ============================================================================
// ROUTES DE DEBUG
// ============================================================================

// GET /api/messages/debug/all - Voir tous les messages (pour debug)
router.get('/debug/all', async (req, res) => {
    try {
        console.log('🔍 DEBUG ALL: Requête pour tous les messages');

        const { data, error } = await supabase
            .from('Message')
            .select('*')
            .order('date_envoi', { ascending: false })
            .limit(50);

        if (error) {
            console.error('❌ DEBUG ALL: Erreur Supabase:', error);
            throw error;
        }

        console.log(`✅ DEBUG ALL: ${data?.length || 0} messages trouvés`);

        res.json({
            success: true,
            count: data?.length || 0,
            messages: data || []
        });
    } catch (error) {
        console.error('❌ DEBUG ALL: Erreur générale:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Erreur lors de la récupération des messages de debug'
        });
    }
});

// GET /api/messages/debug/room/:roomId - Voir les messages d'une room spécifique
router.get('/debug/room/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        console.log(`🔍 DEBUG ROOM: Requête messages pour room: ${roomId}`);

        const { data, error } = await supabase
            .from('Message')
            .select('*')
            .eq('id_partie', roomId)
            .order('date_envoi', { ascending: true });

        if (error) {
            console.error(`❌ DEBUG ROOM: Erreur pour room ${roomId}:`, error);
            throw error;
        }

        console.log(`✅ DEBUG ROOM: ${data?.length || 0} messages pour room ${roomId}`);

        res.json({
            success: true,
            roomId,
            count: data?.length || 0,
            messages: data || []
        });
    } catch (error) {
        console.error('❌ DEBUG ROOM: Erreur générale:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/messages/debug/test - Tester l'envoi d'un message
router.post('/debug/test', async (req, res) => {
    try {
        const { roomId, contenu, user } = req.body;

        console.log('🧪 DEBUG TEST: Envoi message test:', { roomId, contenu, user });

        // Recherche de l'utilisateur
        let id_utilisateur = null;
        if (user) {
            const { data: userData, error: userError } = await supabase
                .from('utilisateur')
                .select('id')
                .eq('pseudo', user)
                .single();

            if (userError) {
                console.error('❌ DEBUG TEST: Erreur recherche utilisateur:', userError);
            } else {
                id_utilisateur = userData?.id || null;
                console.log(`👤 DEBUG TEST: Utilisateur "${user}" → ID: ${id_utilisateur}`);
            }
        }

        const testMessage = {
            id_partie: roomId || 'test-room-debug',
            id_utilisateur,
            contenu: contenu || 'Message de test ' + new Date().toISOString(),
            type_message: 'chat',
            date_envoi: new Date().toISOString()
        };

        console.log('📝 DEBUG TEST: Données à insérer:', testMessage);

        const { data, error } = await supabase
            .from('Message')
            .insert([testMessage])
            .select()
            .single();

        if (error) {
            console.error('❌ DEBUG TEST: Erreur insertion:', error);
            throw error;
        }

        console.log('✅ DEBUG TEST: Message inséré avec succès:', {
            id: data.id,
            contenu: data.contenu,
            date_envoi: data.date_envoi
        });

        res.json({
            success: true,
            message: 'Message de test créé avec succès',
            data
        });
    } catch (error) {
        console.error('❌ DEBUG TEST: Erreur générale:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/messages/debug/stats - Statistiques des messages
router.get('/debug/stats', async (req, res) => {
    try {
        console.log('📊 DEBUG STATS: Requête statistiques messages');

        // Compter le total des messages
        const { count, error: countError } = await supabase
            .from('Message')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('❌ DEBUG STATS: Erreur comptage:', countError);
            throw countError;
        }

        // Messages par type
        const { data: byType, error: typeError } = await supabase
            .from('Message')
            .select('type_message, count')
            .group('type_message');

        if (typeError) {
            console.error('❌ DEBUG STATS: Erreur par type:', typeError);
            throw typeError;
        }

        // Derniers messages
        const { data: recent, error: recentError } = await supabase
            .from('Message')
            .select('*')
            .order('date_envoi', { ascending: false })
            .limit(5);

        if (recentError) {
            console.error('❌ DEBUG STATS: Erreur messages récents:', recentError);
            throw recentError;
        }

        console.log(`📊 DEBUG STATS: ${count} messages au total`);

        res.json({
            success: true,
            stats: {
                total: count,
                byType: byType || [],
                recent: recent || []
            }
        });
    } catch (error) {
        console.error('❌ DEBUG STATS: Erreur générale:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/messages/debug/health - Vérifier la connexion à la table Message
router.get('/debug/health', async (req, res) => {
    try {
        console.log('🏥 DEBUG HEALTH: Test connexion table Message');

        const { data, error } = await supabase
            .from('Message')
            .select('id')
            .limit(1);

        if (error) {
            console.error('❌ DEBUG HEALTH: Erreur connexion table:', error);
            throw error;
        }

        console.log('✅ DEBUG HEALTH: Connexion table Message OK');

        res.json({
            success: true,
            message: 'Connexion à la table Message fonctionnelle',
            tableAccess: true,
            sampleData: data
        });
    } catch (error) {
        console.error('❌ DEBUG HEALTH: Erreur générale:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            tableAccess: false
        });
    }
});

export default router;