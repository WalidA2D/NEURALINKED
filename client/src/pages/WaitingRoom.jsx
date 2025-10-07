import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { RoomProvider, useRoom } from "../context/RoomContext.jsx";

function WaitingShell() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const [search] = useSearchParams();

  // Valeurs par défaut pour éviter les erreurs au render (players.length, etc.)
  const {
    socket,
    connected = false,
    code = "",
    players = [],
    hostId,
    startGame,
    leaveRoom
  } = useRoom();

  const me = "me"; // TODO: remplace par ton vrai userId
  // isHost si je suis l'hôte OU si query ?host=1
  const isHost = hostId === me || search.get("host") === "1";

  // 2 à 5 joueurs requis
  const canStart = players.length >= 1 && players.length <= 5;

  useEffect(() => {
    // écoute l'évènement "début de partie"
    const onStart = (ev) => {
      const id = ev.detail?.roomId || roomId;
      nav(`/partie/${id}/enigme/1`, { replace: true });
    };
    window.addEventListener("ROOM_START", onStart);
    window.addEventListener("LOCAL_ROOM_START", onStart);
    return () => {
      window.removeEventListener("ROOM_START", onStart);
      window.removeEventListener("LOCAL_ROOM_START", onStart);
    };
  }, [nav, roomId]);

  function handleStart() {
    if (!canStart) return;
    startGame?.(); // notifiera tout le monde; en local ça déclenche l’event
  }

  function handleCopy() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
  }

  function handleLeave() {
    leaveRoom?.();
    nav("/lobby", { replace: true });
  }

  return (
    <div className="auth full-bleed">
      <main className="auth__panel">
        <header className="auth__header">
          <h1 className="auth__title">
            <span className="brand">NEURALINKED</span>
            <span className="sep"> – </span>
            <span className="subtitle">Salle d’attente</span>
          </h1>
          <p className="auth__tagline">Partage le code pour inviter des joueurs (2 à 5 requis).</p>
        </header>

        <section className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="pill">
              Code : <strong style={{ marginLeft: 6 }}>{code}</strong>
            </div>
            <button className="btn" type="button" onClick={handleCopy}>Copier le code</button>
            <div className="pill">Joueurs : {players.length}</div>
            <div className="pill">{connected ? "Socket 🟢" : "Socket 🔴"}</div>
          </div>

          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {players.map((p) => (
              <li key={p.id || p.name}>
                {p.name}
                {p.id === me ? " (moi)" : ""}
                {hostId === p.id ? " ⭐" : ""}
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn--ghost" type="button" onClick={handleLeave}>Quitter</button>
            {isHost ? (
              <button className="btn" type="button" onClick={handleStart} disabled={!canStart}>
                Lancer la partie {canStart ? "" : "(2–5 joueurs)"}
              </button>
            ) : (
              <div className="pill">En attente de l’hôte…</div>
            )}
          </div>
        </section>
      </main>
      <aside className="auth__art" aria-hidden="true" />
    </div>
  );
}

export default function WaitingRoom() {
  const { roomId } = useParams();
  const [search] = useSearchParams();
  const isHost = search.get("host") === "1";
  const pwd = search.get("pwd") || "";
  const username = localStorage.getItem("username") || "Joueur";

  return (
    <RoomProvider roomId={roomId} username={username} isHost={isHost} roomPassword={pwd}>
      <WaitingShell />
    </RoomProvider>
  );
}
