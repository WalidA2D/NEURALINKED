// src/context/RoomContext.jsx
import { createContext, useContext, useEffect, useRef, useState, useMemo } from "react";
import { io } from "socket.io-client";

const SOCKET_URL   = import.meta.env.VITE_SOCKET_URL || "";            // ex: https://neuralinked-socket.onrender.com
const SOCKET_PATH  = import.meta.env.VITE_SOCKET_PATH || "/socket.io"; // doit matcher le serveur
const FORCE_WS     = (import.meta.env.VITE_SOCKET_FORCE_WS || "0") === "1";
const WITH_CREDS   = (import.meta.env.VITE_SOCKET_WITH_CREDENTIALS || "0") === "1";
const RECONN_MAX   = Number(import.meta.env.VITE_SOCKET_RECONNECT_ATTEMPTS || 10);
const RECONN_DELAY = Number(import.meta.env.VITE_SOCKET_RECONNECT_DELAY || 1000); // ms

// ========= Context =========
const RoomCtx = createContext(null);
export const useRoom = () => useContext(RoomCtx);

// --- Fallback local (sans serveur)
function useLocalRoom(roomId, username, wantHost, roomPassword) {
  const [connected] = useState(true);
  const [players] = useState([{ id: "me", name: username || "Joueur" }]);
  const [hostId] = useState(wantHost ? "me" : null);
  const [code] = useState(roomId);
  const [pwd] = useState(roomPassword || "");

  function startGame() {
    window.dispatchEvent(new CustomEvent("LOCAL_ROOM_START", { detail: { roomId } }));
  }
  function leaveRoom() {}

  return { socket: null, connected, code, pwd, players, hostId, startGame, leaveRoom };
}

export function RoomProvider({ children, roomId, username, isHost = false, roomPassword = "" }) {
  const isLocal = !SOCKET_URL;
  const socketRef = useRef(null);

  const [state, setState] = useState({
    connected: false,
    code: roomId || "",
    pwd: roomPassword || "",
    players: [],
    hostId: null,
  });

  // ---- Helper: join room (idempotent côté serveur)
  const emitJoin = (s) => {
    if (!s || !roomId) return;
    s.emit("room:join", {
      roomId,
      username: username || "Joueur",
      password: roomPassword || "",
      host: !!isHost,
    });
  };

  useEffect(() => {
    if (isLocal) {
      console.info("[Room] Mode local activé (pas de VITE_SOCKET_URL).");
      return;
    }
    if (socketRef.current) {
      // Socket déjà créée -> on s’assure d’être bien dans la room courante si props changent
      emitJoin(socketRef.current);
      return;
    }

    console.info("[Room] Connexion Socket.IO ->", SOCKET_URL, "| path:", SOCKET_PATH);
    const s = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: FORCE_WS ? ["websocket"] : ["websocket", "polling"],
      withCredentials: WITH_CREDS,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: RECONN_MAX,
      reconnectionDelay: RECONN_DELAY,
      reconnectionDelayMax: 30_000,
      timeout: 20_000,
    });
    socketRef.current = s;

    const onConnect = () => {
      console.info("[Room] connect:", s.id);
      setState((st) => ({ ...st, connected: true }));
      emitJoin(s);
    };

    const onConnectError = (err) => {
      console.error("[Room] connect_error:", err?.message || err);
    };

    const onReconnectAttempt = (n) => {
      console.warn(`[Room] reconnect_attempt #${n}`);
    };

    const onReconnect = (n) => {
      console.info(`[Room] reconnected after #${n}, id:`, s.id);
      setState((st) => ({ ...st, connected: true }));
      emitJoin(s); // rejoin auto la room après reconnexion
    };

    const onDisconnect = (reason) => {
      console.warn("[Room] disconnect:", reason);
      setState((st) => ({ ...st, connected: false }));
    };

    const onRoomUpdate = (payload = {}) => {
      const { code, pwd, players, hostId } = payload;
      setState((st) => ({
        ...st,
        code: code ?? st.code,
        pwd: pwd ?? st.pwd,
        players: Array.isArray(players) ? players : st.players,
        hostId: hostId ?? st.hostId,
      }));
    };

    const onRoomStart = ({ roomId: startedId }) => {
      console.info("[Room] room:start reçu:", startedId);
      window.dispatchEvent(new CustomEvent("ROOM_START", { detail: { roomId: startedId || roomId } }));
    };

    // Listeners
    s.on("connect", onConnect);
    s.on("connect_error", onConnectError);
    s.on("reconnect_attempt", onReconnectAttempt);
    s.on("reconnect", onReconnect);
    s.on("disconnect", onDisconnect);
    s.on("room:update", onRoomUpdate);
    s.on("room:start", onRoomStart);

    // ⚡ Réveil d’onglet: si déconnecté, on retente
    const onVis = () => {
      if (document.visibilityState === "visible" && s.disconnected) {
        console.info("[Room] onglet actif → tentative de reconnexion");
        try { s.connect(); } catch {}
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // Quitte proprement la room si on ferme/refresh
    const onBeforeUnload = () => {
      try { s.emit("room:leave", { roomId }); } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // Déconnexion globale (depuis NavBar → handleLogout)
    const onGlobalLogout = () => {
      try { s.emit("room:leave", { roomId }); } catch {}
      try { s.removeAllListeners(); } catch {}
      try { s.disconnect(); } catch {}
      socketRef.current = null;

      setState({
        connected: false,
        code: "",
        pwd: "",
        players: [],
        hostId: null,
      });
    };
    window.addEventListener("GLOBAL_LOGOUT", onGlobalLogout);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("GLOBAL_LOGOUT", onGlobalLogout);
      s.off("connect", onConnect);
      s.off("connect_error", onConnectError);
      s.off("reconnect_attempt", onReconnectAttempt);
      s.off("reconnect", onReconnect);
      s.off("disconnect", onDisconnect);
      s.off("room:update", onRoomUpdate);
      s.off("room:start", onRoomStart);
      try { s.disconnect(); } catch {}
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocal, roomId, username, isHost, roomPassword]);

  // Mode local
  if (isLocal) {
    const local = useLocalRoom(roomId, username, isHost, roomPassword);
    return <RoomCtx.Provider value={local}>{children}</RoomCtx.Provider>;
  }

  // API publiques
  const startGame = () => socketRef.current?.emit("room:start", { roomId });
  const leaveRoom  = () => socketRef.current?.emit("room:leave", { roomId });

  const value = useMemo(() => ({
    socket: socketRef.current,
    connected: state.connected,
    code: state.code,
    pwd: state.pwd,
    players: state.players || [],
    hostId: state.hostId,
    startGame,
    leaveRoom,
  }), [state.connected, state.code, state.pwd, state.players, state.hostId]);

  return <RoomCtx.Provider value={value}>{children}</RoomCtx.Provider>;
}
