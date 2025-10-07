import { Outlet, useParams, useSearchParams } from "react-router-dom";
import { RoomProvider } from "../context/RoomContext.jsx";

export default function RoomLayout() {
  const { roomId } = useParams();
  const [search] = useSearchParams();

  const isHost = search.get("host") === "1";
  const pwd = search.get("pwd") || "";
  const username = localStorage.getItem("username") || "Joueur";

  return (
    <RoomProvider roomId={roomId} username={username} isHost={isHost} roomPassword={pwd}>
      <Outlet />
    </RoomProvider>
  );
}
