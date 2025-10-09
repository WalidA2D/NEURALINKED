import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRoom } from "../context/RoomContext.jsx";

const GameCtx = createContext(null);
export const useGame = () => useContext(GameCtx);

export function GameProvider({ children, roomId, username }) {
    const { socket, connected, code, players: roomPlayers } = useRoom();
    const [players, setPlayers] = useState(roomPlayers || []);
    const [messages, setMessages] = useState([]);
    const [typing, setTyping] = useState({});
    const [step, setStep] = useState(1);
    const [endsAt, setEndsAt] = useState(null);

    // Sync joueurs depuis le RoomContext
    useEffect(() => {
        setPlayers(roomPlayers || []);
    }, [roomPlayers]);

    // 🔥 CORRECTION : Configuration + demande d'historique
    useEffect(() => {
        if (!socket || !roomId) return;

        console.log("🎮 [GameContext] Configuration des listeners pour", roomId);

        // Handler pour l'état du jeu
        const onGameState = (state = {}) => {
            console.log("📦 [GameContext] game:state reçu:", state);
            if (state.players) setPlayers(state.players);
            if (state.step) setStep(state.step);
            if (state.endsAt) setEndsAt(state.endsAt);
            if (Array.isArray(state.messages)) setMessages(state.messages);
        };

        // Handler pour l'historique du chat
        const onChatHistory = (history) => {
            console.log(`📚 [GameContext] chat:history reçu: ${history?.length || 0} messages`, history);
            setMessages(history || []);
        };

        // Handler pour les nouveaux messages
        // Handler pour les nouveaux messages - VERSION PERMISSIVE
        const onChatMessage = (msg) => {
            console.log("💬 [GameContext] chat:message reçu:", msg);

            setMessages((prevMessages) => {
                // 🔥 VERSION SIMPLIFIÉE : Supprimer TOUS les messages temporaires de cet utilisateur avec le même texte
                const hasTempFromSameUser = prevMessages.some(m =>
                    m.temp && m.user === msg.user && m.text === msg.text
                );

                if (hasTempFromSameUser) {
                    console.log("🔄 [GameContext] Suppression des messages temporaires et ajout du message réel");
                    const filtered = prevMessages.filter(m =>
                        !(m.temp && m.user === msg.user && m.text === msg.text)
                    );
                    return [...filtered, msg];
                }

                // Éviter les doublons normaux
                const exists = prevMessages.some(m => m.id === msg.id);
                if (exists) {
                    console.log("⚠️ [GameContext] Message déjà présent, ignoré");
                    return prevMessages;
                }

                console.log("✅ [GameContext] Ajout du nouveau message");
                return [...prevMessages, msg];
            });
        };

        // Handler pour le typing
        const onTyping = ({ user, isTyping }) => {
            console.log(`⌨️ [GameContext] ${user} ${isTyping ? 'écrit' : 'a arrêté d\'écrire'}`);
            setTyping((t) => ({ ...t, [user]: isTyping }));
        };

        // ✅ Enregistrer les listeners AVANT d'émettre
        socket.on("game:state", onGameState);
        socket.on("chat:history", onChatHistory);
        socket.on("chat:message", onChatMessage);
        socket.on("chat:typing", onTyping);

        // Émettre game:join
        console.log(`🚀 [GameContext] Émission game:join pour ${username} dans ${roomId}`);
        socket.emit("game:join", { roomId, username });

        // 🔥 NOUVEAU : Demander explicitement l'historique après configuration
        console.log(`📥 [GameContext] Demande explicite de l'historique`);
        socket.emit("chat:load-history", { roomId });

        // Cleanup
        return () => {
            console.log("🧹 [GameContext] Nettoyage des listeners");
            socket.off("game:state", onGameState);
            socket.off("chat:history", onChatHistory);
            socket.off("chat:message", onChatMessage);
            socket.off("chat:typing", onTyping);
        };
    }, [socket, roomId, username]);

    // Timer 15 min (si pas géré serveur)
    useEffect(() => {
        if (!endsAt && socket && connected) {
            const target = Date.now() + 15 * 60 * 1000;
            setEndsAt(target);
            socket.emit("game:timer", { roomId, endsAt: target });
        }
    }, [endsAt, socket, connected, roomId]);

    const timeLeftMs = endsAt == null ? null : Math.max(0, endsAt - Date.now());
    const timeLeft = useMemo(() => {
        if (timeLeftMs == null) return "--:--";
        const s = Math.floor(timeLeftMs / 1000);
        return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }, [timeLeftMs]);

    const value = useMemo(
        () => ({
            socket,
            connected,
            roomId,
            username,
            players,
            messages,
            sendMessage: (text) => {
                if (!socket || !text?.trim()) {
                    console.warn("⚠️ [GameContext] Impossible d'envoyer le message");
                    return;
                }

                const currentTime = Date.now();
                const payload = {
                    roomId,
                    user: username,
                    text: text.trim(),
                    ts: currentTime // 🔥 Même timestamp que le message temporaire
                };

                console.log("📤 [GameContext] Envoi du message:", payload);

                // Ajout optimiste avec le MÊME timestamp
                const tempMessage = {
                    id: `temp-${currentTime}-${Math.random().toString(36).substr(2, 9)}`,
                    user: username,
                    text: text.trim(),
                    ts: currentTime, // 🔥 TRÈS IMPORTANT : même timestamp que le payload
                    temp: true
                };

                console.log("📝 [GameContext] Ajout optimiste:", tempMessage);
                setMessages(prev => [...prev, tempMessage]);

                socket.emit("chat:message", payload);
            },
            typing,
            setTypingState: (isTyping) => {
                if (!socket) return;
                socket.emit("chat:typing", { roomId, user: username, isTyping });
            },
            step,
            goToStep: (next) => {
                setStep(next);
                socket?.emit("game:step", { roomId, step: next });
            },
            endsAt,
            timeLeftMs,
            timeLeft,
        }),
        [
            socket,
            connected,
            roomId,
            username,
            players,
            messages,
            typing,
            step,
            endsAt,
            timeLeftMs,
            timeLeft,
        ]
    );

    return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}