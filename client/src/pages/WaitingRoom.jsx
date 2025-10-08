import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roomService } from "../services/roomService.js";

function WaitingShell() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const [search] = useSearchParams();
  const { user, token } = useAuth();

  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const isHost = search.get("host") === "1";
  const code = roomId;

  // Charger les données de la partie
  useEffect(() => {
    async function loadRoom() {
      try {
        const data = await roomService.getRoom(code, token);
        setRoomData(data);

        // 🔥 REDIRECTION AUTOMATIQUE si la partie a commencé
        if (data.status === 'playing' || data.status === 'started' || data.status === 'in_progress') {
          console.log("✅ Partie démarrée, redirection...");
          const roomIdToUse = data.roomId || data.id || code;
          nav(`/partie/${roomIdToUse}/enigme/1`, { replace: true });
          return;
        }

      } catch (err) {
        setError(err.message || "Erreur lors du chargement de la partie");
      } finally {
        setLoading(false);
      }
    }

    loadRoom();

    // Polling pour les mises à jour - intervalle plus court pour une meilleure réactivité
    const interval = setInterval(loadRoom, 2000);
    return () => clearInterval(interval);
  }, [code, token, nav]);

  // Écouter le démarrage de partie (pour les autres événements)
  useEffect(() => {
    const onStart = (ev) => {
      const id = ev.detail?.roomId || roomData?.roomId || code;
      console.log("🎯 Événement ROOM_START reçu, redirection...");
      nav(`/partie/${id}/enigme/1`, { replace: true });
    };

    window.addEventListener("ROOM_START", onStart);
    return () => window.removeEventListener("ROOM_START", onStart);
  }, [nav, roomData, code]);

  async function handleStart() {
    if (!roomData || starting) return;

    setStarting(true);
    try {
      const result = await roomService.startRoom(roomData.roomId || roomData.id, token);
      console.log("🚀 Partie démarrée:", result);

      // Redirection immédiate pour l'hôte
      const roomIdToUse = roomData.roomId || roomData.id || code;
      nav(`/partie/${roomIdToUse}/enigme/1`, { replace: true });

    } catch (err) {
      setError(err.message || "Erreur lors du démarrage de la partie");
      setStarting(false);
    }
  }

  async function handleLeave() {
    if (roomData) {
      try {
        await roomService.leaveRoom(roomData.roomId || roomData.id, token);
      } catch (err) {
        console.error("Erreur en quittant la partie:", err);
      }
    }
    nav("/lobby", { replace: true });
  }

  function handleCopy() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
  }

  if (loading) {
    return (
        <div className="auth full-bleed">
          <main className="auth__panel">
            <div className="card">Chargement de la partie...</div>
          </main>
        </div>
    );
  }

  if (error || !roomData) {
    return (
        <div className="auth full-bleed">
          <main className="auth__panel">
            <div className="card auth__error">
              {error || "Partie non trouvée"}
              <button className="btn" onClick={() => nav("/lobby")}>
                Retour au lobby
              </button>
            </div>
          </main>
        </div>
    );
  }

  const players = roomData.players || [];
  const canStart = isHost && players.length >= 2 && players.length <= 5;
  const isGameStarted = roomData.status !== 'waiting';

  return (
      <div className="auth full-bleed">
        <main className="auth__panel">
          <header className="auth__header">
            <h1 className="auth__title">
              <span className="brand">NEURALINKED</span>
              <span className="sep"> – </span>
              <span className="subtitle">Salle d'attente</span>
            </h1>
            <p className="auth__tagline">Partage le code pour inviter des joueurs (2 à 5 requis).</p>
          </header>

          <section className="card" style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="pill">
                Code : <strong style={{ marginLeft: 6 }}>{roomData.code}</strong>
              </div>
              <button className="btn" type="button" onClick={handleCopy}>
                Copier le code
              </button>
              <div className="pill">Joueurs : {players.length}/5</div>
              <div className="pill">
                Statut : {roomData.status === 'waiting' ? '🟡 En attente' : '🟢 En jeu'}
                {isGameStarted && " - Redirection..."}
              </div>
            </div>

            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {players.map((p) => (
                  <li key={p.id}>
                    {p.pseudo}
                    {p.id === user?.id ? " (moi)" : ""}
                    {p.role === 'host' ? " ⭐" : ""}
                  </li>
              ))}
            </ul>

            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn--ghost" type="button" onClick={handleLeave}>
                Quitter
              </button>
              {isHost ? (
                  <button
                      className="btn"
                      type="button"
                      onClick={handleStart}
                      disabled={!canStart || starting || isGameStarted}
                  >
                    {starting ? "Démarrage..." :
                        isGameStarted ? "Redirection..." :
                            "Lancer la partie"}
                    {!canStart && !isGameStarted ? " (2-5 joueurs)" : ""}
                  </button>
              ) : (
                  <div className="pill">
                    {isGameStarted ? 'Partie en cours - Redirection...' : 'En attente de l\'hôte…'}
                  </div>
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

  return <WaitingShell />;
}