// Neuralinked/server/services/messageService.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

class MessageService {
    // Sauvegarder un message
    async saveMessage(messageData) {
        try {
            const { data, error } = await supabase
                .from('Message')
                .insert([{
                    id_partie: messageData.roomId,
                    id_utilisateur: messageData.userId,
                    contenu: messageData.text,
                    type_message: messageData.type || 'chat'
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur sauvegarde message:', error);
            throw error;
        }
    }

    // Récupérer l'historique des messages d'une partie
    async getRoomMessages(roomId, limit = 100) {
        try {
            const { data, error } = await supabase
                .from('Message')
                .select(`
          *,
          Utilisateur:pseudo
        `)
                .eq('id_partie', roomId)
                .order('date_envoi', { ascending: true })
                .limit(limit);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur récupération messages:', error);
            throw error;
        }
    }

    // Récupérer les informations utilisateur pour le chat
    async getUserForChat(userId) {
        try {
            const { data, error } = await supabase
                .from('Utilisateur')
                .select('id, pseudo')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
            return { id: userId, pseudo: 'Utilisateur' };
        }
    }
}

module.exports = new MessageService();