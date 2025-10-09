// src/context/GameContext.jsx
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

  // Reset propre au logout global
  useEffect(() => {
    const onGlobalLogout = () => {
      setMessages([]);
      setTyping({});
      setStep(1);
      setEndsAt(null);
    };
    window.addEventListener("GLOBAL_LOGOUT", onGlobalLogout);
    return () => window.removeEventListener("GLOBAL_LOGOUT", onGlobalLogout);
  }, []);

  // Listeners + demande d'historique
  useEffect(() => {
    if (!socket || !roomId) return;

    console.log("🎮 [GameContext] Setup listeners pour", roomId);

    const onGameState = (state = {}) => {
      console.log("📦 [GameContext] game:state:", state);
      if (state.players) setPlayers(state.players);
      if (state.step) setStep(state.step);
      if (state.endsAt) setEndsAt(state.endsAt);
      if (Array.isArray(state.messages)) setMessages(state.messages);
    };

    const onChatHistory = (history) => {
      console.log(`📚 [GameContext] chat:history: ${history?.length || 0} messages`, history);
      setMessages(history || []);
    };

    const onChatMessage = (msg) => {
      console.log("💬 [GameContext] chat:message:", msg);
      setMessages((prev) => {
        // Si on a un message “temp”, on le remplace par celui confirmé (ACK ou diffusion)
        const tempIdx = prev.findIndex(
          (m) => m.temp && m.text === msg.text && m.user === msg.user && Math.abs(m.ts - msg.ts) < 5000
        );
        if (tempIdx !== -1) {
          const clone = [...prev];
          clone[tempIdx] = msg;
          return clone;
        }
        // Sinon, éviter les doublons exacts par id
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onTyping = ({ user, isTyping }) => {
      setTyping((t) => ({ ...t, [user]: isTyping }));
    };

    socket.on("game:state", onGameState);
    socket.on("chat:history", onChatHistory);
    socket.on("chat:message", onChatMessage);
    socket.on("chat:typing", onTyping);

    // Émettre game:join + demander l'historique
    socket.emit("game:join", { roomId, username });
    socket.emit("chat:load-history", { roomId });

    return () => {
      console.log("🧹 [GameContext] cleanup listeners");
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

        const clean = text.trim();
        const now = Date.now();
        const payload = { roomId, user: username, text: clean, ts: now };

        // Ajout optimiste temporaire
        const tempMessage = {
          id: `temp-${now}-${Math.random().toString(36).slice(2, 9)}`,
          user: username,
          text: clean,
          ts: now,
          temp: true,
        };
        setMessages((prev) => [...prev, tempMessage]);

        // ⚡ Utilise l’ACK serveur pour remplacer le message “temp”
        socket.emit("chat:message", payload, (serverMessage) => {
          if (!serverMessage) return;
          setMessages((prev) => {
            const i = prev.findIndex(
              (m) => m.temp && m.text === serverMessage.text && m.user === serverMessage.user && Math.abs(m.ts - serverMessage.ts) < 5000
            );
            if (i !== -1) {
              const clone = [...prev];
              clone[i] = serverMessage;
              return clone;
            }
            // si pas trouvé (rare), on ajoute si pas déjà présent
            if (serverMessage.id && prev.some((m) => m.id === serverMessage.id)) return prev;
            return [...prev, serverMessage];
          });
        });
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
    [socket, connected, roomId, username, players, messages, typing, step, endsAt, timeLeftMs, timeLeft]
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
