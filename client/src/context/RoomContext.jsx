import { createContext, useContext, useEffect, useRef, useState, useMemo } from "react";
import { io } from "socket.io-client"; // ✅ named import

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ""; // ex: http://localhost:3001
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io"; // change if server uses custom path

const RoomCtx = createContext(null);
export const useRoom = () => useContext(RoomCtx);

// --- Fallback local (si pas de serveur lancé)
function useLocalRoom(roomId, username, wantHost, roomPassword) {
  const [connected] = useState(true);
  const [players, setPlayers] = useState([{ id: "me", name: username || "Joueur" }]);
  const [hostId] = useState(wantHost ? "me" : null); // ✅ fix: seulement si wantHost
  const [code] = useState(roomId);
  const [pwd] = useState(roomPassword || "");

  function startGame() {
    window.dispatchEvent(new CustomEvent("LOCAL_ROOM_START", { detail: { roomId } }));
  }
  function leaveRoom() {
    // rien en local
  }

  return { socket: null, connected, code, pwd, players, hostId, startGame, leaveRoom };
}

export function RoomProvider({ children, roomId, username, isHost = false, roomPassword = "" }) {
  const isLocal = !SOCKET_URL; // si pas d'URL -> mode local
  const socketRef = useRef(null);

  const [state, setState] = useState({
    connected: false,
    code: roomId || "",
    pwd: roomPassword || "",
    players: [],
    hostId: null,
  });

  useEffect(() => {
    if (isLocal) {
      console.info("[Room] Mode local activé (pas de VITE_SOCKET_URL).");
      return;
    }
    if (socketRef.current) {
      return; // évite recréer la socket
    }

    console.info("[Room] Connexion Socket.IO ->", SOCKET_URL, "path:", SOCKET_PATH);

    const s = io(SOCKET_URL, {
      path: SOCKET_PATH,                 // ✅ aligne avec le serveur si custom
      transports: ["websocket", "polling"], // ✅ autorise fallback
      autoConnect: true,
      // withCredentials: true,          // décommente si ton serveur CORS l'exige
      // auth: { token: "..." },         // si tu as un middleware d'auth coté serveur
    });
    socketRef.current = s;

    s.on("connect", () => {
      console.info("[Room] Socket connectée:", s.id);
      setState((st) => ({ ...st, connected: true }));
      s.emit("room:join", {
        roomId,
        username: username || "Joueur",
        password: roomPassword,
        host: isHost,
      });
    });

    s.on("connect_error", (err) => {
      console.error("[Room] connect_error:", err?.message || err);
    });

    s.on("disconnect", (reason) => {
      console.warn("[Room] disconnect:", reason);
      setState((st) => ({ ...st, connected: false }));
    });

    // <-- ATTENTION: aligne ces noms avec ton serveur
    s.on("room:update", (payload = {}) => {
      const { code, pwd, players, hostId } = payload;
      setState((st) => ({
        ...st,
        code: code ?? st.code,
        pwd: pwd ?? st.pwd,
        players: Array.isArray(players) ? players : st.players,
        hostId: hostId ?? st.hostId,
      }));
    });

    s.on("room:start", ({ roomId: startedId }) => {
      console.info("[Room] room:start reçu:", startedId);
      window.dispatchEvent(new CustomEvent("ROOM_START", { detail: { roomId: startedId || roomId } }));
    });

    return () => {
      console.info("[Room] cleanup: disconnect");
      s.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocal, roomId, username, isHost, roomPassword]);

  // Mode local (aucun serveur)
  if (isLocal) {
    const local = useLocalRoom(roomId, username, isHost, roomPassword);
    return <RoomCtx.Provider value={local}>{children}</RoomCtx.Provider>;
  }

  function startGame() {
    socketRef.current?.emit("room:start", { roomId });
  }
  function leaveRoom() {
    socketRef.current?.emit("room:leave", { roomId });
  }

  const value = useMemo(
    () => ({
      socket: socketRef.current,
      connected: state.connected,
      code: state.code,
      pwd: state.pwd,
      players: state.players || [],
      hostId: state.hostId,
      startGame,
      leaveRoom,
    }),
    [state.connected, state.code, state.pwd, state.players, state.hostId]
  );

  return <RoomCtx.Provider value={value}>{children}</RoomCtx.Provider>;
}
