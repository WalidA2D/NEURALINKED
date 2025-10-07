// /client/src/context/GameContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRoom } from "../context/RoomContext.jsx";

const GameCtx = createContext(null);
export const useGame = () => useContext(GameCtx);

export function GameProvider({ children, roomId, username }) {
  const { socket, connected, code, players: roomPlayers } = useRoom(); // ✅ réutilise la socket
  const [players, setPlayers] = useState(roomPlayers || []);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState({});
  const [step, setStep] = useState(1);
  const [endsAt, setEndsAt] = useState(null);

  // sync joueurs depuis le RoomContext
  useEffect(() => { setPlayers(roomPlayers || []); }, [roomPlayers]);

  // s’abonner aux évènements de jeu sur la socket existante
  useEffect(() => {
    if (!socket) return;

    const onGameState = (state = {}) => {
      if (state.players) setPlayers(state.players);
      if (state.step) setStep(state.step);
      if (state.endsAt) setEndsAt(state.endsAt);
      if (Array.isArray(state.messages)) setMessages(state.messages);
    };
    const onChatMsg = (msg) => setMessages((m) => [...m, msg]);
    const onTyping = ({ user, isTyping }) => setTyping((t) => ({ ...t, [user]: isTyping }));

    socket.on("game:state", onGameState);
    socket.on("chat:message", onChatMsg);
    socket.on("chat:typing", onTyping);

    // joindre le canal de jeu (si tu en as un distinct)
    socket.emit("game:join", { roomId, username });

    return () => {
      socket.off("game:state", onGameState);
      socket.off("chat:message", onChatMsg);
      socket.off("chat:typing", onTyping);
      // ❌ ne pas socket.disconnect() ici — on laisse le RoomProvider gérer
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

  const timeLeftMs = Math.max(0, (endsAt || 0) - Date.now());
  const timeLeft = useMemo(() => {
    const s = Math.floor(timeLeftMs / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }, [timeLeftMs]);

  const value = useMemo(() => ({
    socket,
    connected,
    roomId,
    username,
    players,
    messages,
    sendMessage: (text) => {
      const payload = { roomId, user: username, text, ts: Date.now() };
      setMessages((m) => [...m, payload]);      // optimiste
      socket?.emit("chat:message", payload);
    },
    typing,
    setTypingState: (isTyping) => socket?.emit("chat:typing", { roomId, user: username, isTyping }),
    step,
    goToStep: (next) => {
      setStep(next);
      socket?.emit("game:step", { roomId, step: next });
    },
    endsAt,
    timeLeftMs,
    timeLeft,
  }), [socket, connected, roomId, username, players, messages, typing, step, endsAt, timeLeftMs, timeLeft]);

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
