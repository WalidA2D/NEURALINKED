import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

// ⚠️ adapte l’URL de ton backend socket.io
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
const GameCtx = createContext(null);
export const useGame = () => useContext(GameCtx);

export function GameProvider({ children, roomId, username }) {
  const [socketState, setSocketState] = useState({ connected:false, error:null });
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState({});
  const [step, setStep] = useState(1); // 1..4
  const [endsAt, setEndsAt] = useState(null); // timestamp ms
  const socketRef = useRef(null);

  // Connexion socket + join room
  useEffect(() => {
    const s = io(SOCKET_URL, { transports:["websocket"], autoConnect:true });
    socketRef.current = s;

    s.on("connect", () => {
      setSocketState({ connected:true, error:null });
      s.emit("joinRoom", { roomId, username });
    });

    s.on("disconnect", () => setSocketState({ connected:false, error:null }));
    s.on("connect_error", (e) => setSocketState({ connected:false, error: e?.message || "Erreur socket" }));

    s.on("roomState", (state) => {
      setPlayers(state.players || []);
      if (state.step) setStep(state.step);
      if (state.endsAt) setEndsAt(state.endsAt);
      // init messages snapshot optionnel
      if (Array.isArray(state.messages)) setMessages(state.messages);
    });

    s.on("chat:message", (msg) => setMessages((m) => [...m, msg]));
    s.on("chat:typing", ({ user, isTyping }) => setTyping((t) => ({ ...t, [user]: isTyping })));

    return () => { s.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, username]);

  // Démarrer le timer 15 min si pas encore fixé (host côté serveur en vrai)
  useEffect(() => {
    if (!endsAt && socketRef.current?.connected) {
      const now = Date.now();
      const target = now + 15 * 60 * 1000;
      setEndsAt(target);
      socketRef.current.emit("game:timer", { roomId, endsAt: target });
    }
  }, [endsAt, roomId]);

  const timeLeftMs = Math.max(0, (endsAt || 0) - Date.now());
  const timeLeft = useMemo(() => {
    const s = Math.floor(timeLeftMs / 1000);
    const mm = String(Math.floor(s/60)).padStart(2,"0");
    const ss = String(s%60).padStart(2,"0");
    return `${mm}:${ss}`;
  }, [timeLeftMs]);

  // Tick local
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x)=>x+1), 250);
    return () => clearInterval(id);
  }, []);

  function sendMessage(text) {
    const payload = { roomId, user: username, text, ts: Date.now() };
    setMessages((m) => [...m, payload]); // optimiste
    socketRef.current?.emit("chat:message", payload);
  }
  function setTypingState(isTyping) {
    socketRef.current?.emit("chat:typing", { roomId, user: username, isTyping });
  }
  function goToStep(next) {
    setStep(next);
    socketRef.current?.emit("game:step", { roomId, step: next });
  }

  const value = {
    socket: socketRef.current,
    connected: socketState.connected,
    error: socketState.error,
    roomId, username,
    players,
    messages, sendMessage,
    typing, setTypingState,
    step, goToStep,
    endsAt, timeLeftMs, timeLeft,
  };

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
