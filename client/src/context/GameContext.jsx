// client/src/context/GameContext.jsx
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

  useEffect(() => {
    setPlayers(roomPlayers || []);
  }, [roomPlayers]);

  useEffect(() => {
    if (!socket) return;

    const onGameState = (state = {}) => {
      if (state.players) setPlayers(state.players);
      if (state.step) setStep(state.step);
      if (state.endsAt) setEndsAt(state.endsAt);
      if (Array.isArray(state.messages)) setMessages(state.messages);
    };
    const onGameStep = ({ step }) => setStep(step);
    const onPuzzleSolved = ({ puzzle, by }) => {
      // Optionnel: afficher un toast/console
      // console.log(`Énigme ${puzzle} validée par ${by}`);
    };

    const onChatMsg = (msg) => setMessages((m) => [...m, msg]);
    const onTyping = ({ user, isTyping }) =>
      setTyping((t) => ({ ...t, [user]: isTyping }));

    socket.on("game:state", onGameState);
    socket.on("game:step", onGameStep);
    socket.on("game:puzzle-solved", onPuzzleSolved);
    socket.on("chat:message", onChatMsg);
    socket.on("chat:typing", onTyping);

    socket.emit("game:join", { roomId, username });

    return () => {
      socket.off("game:state", onGameState);
      socket.off("game:step", onGameStep);
      socket.off("game:puzzle-solved", onPuzzleSolved);
      socket.off("chat:message", onChatMsg);
      socket.off("chat:typing", onTyping);
    };
  }, [socket, roomId, username]);

  // Timer 15 min (poussé une seule fois s'il n'existe pas encore)
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
        const payload = { roomId, user: username, text, ts: Date.now() };
        setMessages((m) => [...m, payload]); // optimiste
        socket?.emit("chat:message", payload);
      },
      typing,
      setTypingState: (isTyping) =>
        socket?.emit("chat:typing", { roomId, user: username, isTyping }),
      step,
      goToStep: (next) => {
        setStep(next); // optimiste
        socket?.emit("game:step", { roomId, step: next });
      },
      // 🔑 A appeler quand une énigme est validée (puzzleNum = 1..4)
      solvePuzzle: (puzzleNum) => {
        socket?.emit("puzzle:solved", { roomId, puzzle: Number(puzzleNum), by: username });
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
