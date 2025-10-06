import { createContext, useContext, useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ""; // vide = fallback local
const RoomCtx = createContext(null);
export const useRoom = () => useContext(RoomCtx);

// Fallback local (si pas de serveur) : simule une salle d’attente sur cet onglet
function useLocalRoom(roomId, username, wantHost, roomPassword) {
  const [connected] = useState(true);
  const [players, setPlayers] = useState([{ id: "me", name: username }]);
  const [hostId] = useState(wantHost ? "me" : "me"); // single-tab => toi host
  const [code] = useState(roomId);
  const [pwd] = useState(roomPassword || "");

  function startGame() { window.dispatchEvent(new CustomEvent("LOCAL_ROOM_START", { detail:{ roomId } })); }
  function leaveRoom() { /* rien en local */ }

  return { socket:null, connected, code, pwd, players, hostId, startGame, leaveRoom };
}

export function RoomProvider({ children, roomId, username, isHost=false, roomPassword="" }) {
  const [state, setState] = useState({
    connected:false, code:roomId, pwd:roomPassword, players:[], hostId:null
  });
  const socketRef = useRef(null);

  const isLocal = !SOCKET_URL;
  useEffect(() => {
    if (isLocal) return; // fallback local
    const s = io(SOCKET_URL, { transports:["websocket"], autoConnect:true });
    socketRef.current = s;

    s.on("connect", () => {
      setState((st)=>({ ...st, connected:true }));
      s.emit("room:join", { roomId, username, password: roomPassword, host: isHost });
    });
    s.on("disconnect", () => setState((st)=>({ ...st, connected:false })));
    s.on("room:update", (payload) => {
      setState((st)=>({ ...st, ...payload })); // {code,pwd,players,hostId}
    });
    s.on("room:start", ({ roomId }) => {
      // propager un event pour que la page attente redirige
      window.dispatchEvent(new CustomEvent("ROOM_START", { detail:{ roomId } }));
    });

    return () => s.disconnect();
  }, [roomId, username, isHost, roomPassword, isLocal]);

  if (isLocal) {
    const local = useLocalRoom(roomId, username, isHost, roomPassword);
    return (
      <RoomCtx.Provider value={local}>{children}</RoomCtx.Provider>
    );
  }

  function startGame(){
    socketRef.current?.emit("room:start", { roomId });
  }
  function leaveRoom(){
    socketRef.current?.emit("room:leave", { roomId });
  }

  return (
    <RoomCtx.Provider
      value={{
        socket: socketRef.current,
        connected: state.connected,
        code: state.code,
        pwd: state.pwd,
        players: state.players,
        hostId: state.hostId,
        startGame,
        leaveRoom,
      }}
    >
      {children}
    </RoomCtx.Provider>
  );
}
