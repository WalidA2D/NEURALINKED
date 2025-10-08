import { api } from '../api';

export const roomService = {
    // Créer une partie
    async createRoom(password = '', token) {
        const data = await api('/api/rooms/create', {
            method: 'POST',
            body: { password },
            token: token
        });
        return data.data;
    },

    // Rejoindre une partie
    async joinRoom(code, password = '', token) {
        const data = await api('/api/rooms/join', {
            method: 'POST',
            body: { code, password },
            token: token
        });
        return data.data;
    },

    // Démarrer une partie
    async startRoom(roomId, token) {
        const data = await api(`/api/rooms/${roomId}/start`, {
            method: 'POST',
            body: {},
            token: token
        });
        return data.data;
    },

    // Quitter une partie
    async leaveRoom(roomId, token) {
        const data = await api(`/api/rooms/${roomId}/leave`, {
            method: 'POST',
            body: {},
            token: token
        });
        return data;
    },

    // Obtenir les infos d'une partie
    async getRoom(code, token) {
        const data = await api(`/api/rooms/${code}`, {
            token: token
        });
        return data.data;
    }
};