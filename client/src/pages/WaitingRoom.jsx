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
  const [successMessage, setSuccessMessage] = useState("");

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

        // Message de succès quand un joueur rejoint
        if (data.players && data.players.length > (roomData?.players?.length || 0)) {
          setSuccessMessage("Nouveau joueur a rejoint la partie !");
          setTimeout(() => setSuccessMessage(""), 3000);
        }

      } catch (err) {
        console.error("❌ Erreur chargement partie:", err);
        setError(err.message || "Erreur lors du chargement de la partie");
      } finally {
        setLoading(false);
      }
    }

    loadRoom();

    // Polling pour les mises à jour
    const interval = setInterval(loadRoom, 2000);
    return () => clearInterval(interval);
  }, [code, token, nav, roomData]);

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

    // Validation côté client avant d'envoyer la requête
    const players = roomData.players || [];
    if (players.length < 2) {
      setError("❌ Minimum 2 joueurs requis pour démarrer la partie");
      return;
    }

    if (players.length > 5) {
      setError("❌ Maximum 5 joueurs autorisés");
      return;
    }

    setStarting(true);
    setError(""); // Clear previous errors
    setSuccessMessage(""); // Clear success messages

    try {
      const result = await roomService.startRoom(roomData.roomId || roomData.id, token);
      console.log("🚀 Partie démarrée:", result);

      // Redirection immédiate pour l'hôte
      const roomIdToUse = roomData.roomId || roomData.id || code;
      nav(`/partie/${roomIdToUse}/enigme/1`, { replace: true });

    } catch (err) {
      console.error("❌ Erreur démarrage:", err);

      // Messages d'erreur plus spécifiques
      if (err.message.includes("Minimum 2 joueurs")) {
        setError("❌ Impossible de démarrer : minimum 2 joueurs requis");
      } else if (err.message.includes("Maximum 5 joueurs")) {
        setError("❌ Impossible de démarrer : maximum 5 joueurs autorisés");
      } else if (err.message.includes("déjà commencé")) {
        setError("⚠️ Cette partie a déjà commencé");
        // Recharger les données pour la redirection automatique
        setTimeout(() => {
          const roomIdToUse = roomData.roomId || roomData.id || code;
          nav(`/partie/${roomIdToUse}/enigme/1`, { replace: true });
        }, 2000);
      } else if (err.message.includes("hôte")) {
        setError("❌ Seul l'hôte peut démarrer la partie");
      } else if (err.message.includes("HTTP 500")) {
        setError("❌ Erreur serveur lors du démarrage. Vérifiez la console.");
      } else {
        setError(`❌ ${err.message || "Erreur lors du démarrage de la partie"}`);
      }

      setStarting(false);
    }
  }

  async function handleLeave() {
    if (roomData) {
      try {
        await roomService.leaveRoom(roomData.roomId || roomData.id, token);
        setSuccessMessage("✅ Partie quittée avec succès");
      } catch (err) {
        console.error("Erreur en quittant la partie:", err);
        setError("Erreur en quittant la partie, mais redirection...");
      }
    }
    setTimeout(() => {
      nav("/lobby", { replace: true });
    }, 1000);
  }

  function handleCopy() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setSuccessMessage("✅ Code copié dans le presse-papier !");
      setTimeout(() => setSuccessMessage(""), 2000);
    }
  }

  function handleInvite() {
    const inviteText = `Rejoins ma partie Neuralinked ! Code: ${code}\n${window.location.origin}/lobby`;
    if (navigator.share) {
      navigator.share({
        title: 'Rejoins ma partie Neuralinked',
        text: inviteText,
      });
    } else {
      navigator.clipboard.writeText(inviteText);
      setSuccessMessage("✅ Lien d'invitation copié !");
      setTimeout(() => setSuccessMessage(""), 2000);
    }
  }

  if (loading) {
    return (
        <div className="auth full-bleed">
          <main className="auth__panel">
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⏳</div>
              <h3>Chargement de la partie...</h3>
              <p>Connexion à la salle {code}</p>
            </div>
          </main>
        </div>
    );
  }

  if (error && !roomData) {
    return (
        <div className="auth full-bleed">
          <main className="auth__panel">
            <div className="card auth__error">
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
              <h3>Erreur</h3>
              <p>{error || "Partie non trouvée"}</p>
              <button className="btn" onClick={() => nav("/lobby")}>
                Retour au lobby
              </button>
            </div>
          </main>
        </div>
    );
  }

  const players = roomData?.players || [];
  const canStart = isHost && players.length >= 2 && players.length <= 5;
  const isGameStarted = roomData?.status !== 'waiting';

  // Messages d'information
  const startButtonText = starting ? "⏳ Démarrage..." :
      isGameStarted ? "🎯 Redirection..." :
          "🚀 Lancer la partie";

  const startButtonDisabled = !canStart || starting || isGameStarted;

  // Message d'aide pour le bouton
  let helpText = "";
  if (!isHost) {
    helpText = "En attente de l'hôte…";
  } else if (players.length < 2) {
    helpText = `⏳ En attente de ${2 - players.length} joueur(s) supplémentaire(s)`;
  } else if (players.length === 2) {
    helpText = "✅ Prêt à démarrer !";
  } else {
    helpText = `✅ ${players.length} joueurs - Prêt !`;
  }

  return (
      <div className="auth full-bleed">
        <main className="auth__panel">
          <header className="auth__header">
            <h1 className="auth__title">
              <span className="brand">NEURALINKED</span>
              <span className="sep"> – </span>
              <span className="subtitle">Salle d'attente</span>
            </h1>
            <p className="auth__tagline">
              {isHost
                  ? "Partage le code pour inviter des joueurs (2 à 5 requis)."
                  : "En attente du démarrage de la partie par l'hôte."}
            </p>
          </header>

          {/* Messages de statut */}
          {error && (
              <div className="auth__error" style={{ marginBottom: '16px' }}>
                {error}
              </div>
          )}

          {successMessage && (
              <div className="auth__success" style={{ marginBottom: '16px', background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '8px' }}>
                {successMessage}
              </div>
          )}

          <section className="card" style={{ display: "grid", gap: 16 }}>
            {/* En-tête avec code et actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div className="pill" style={{ background: '#007bff', color: 'white' }}>
                  Code : <strong style={{ marginLeft: 6 }}>{roomData?.code}</strong>
                </div>
                <button className="btn btn--outline" type="button" onClick={handleCopy}>
                  📋 Copier
                </button>
                <button className="btn btn--outline" type="button" onClick={handleInvite}>
                  📤 Inviter
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div className="pill">
                  👥 Joueurs : <strong>{players.length}/5</strong>
                </div>
                <div className={`pill ${isGameStarted ? 'pulse' : ''}`} style={{
                  background: isGameStarted ? '#28a745' : '#ffc107',
                  color: isGameStarted ? 'white' : 'black'
                }}>
                  {isGameStarted ? '🟢 En jeu - Redirection...' : '🟡 En attente'}
                </div>
              </div>
            </div>

            {/* Liste des joueurs */}
            <div>
              <h4 style={{ margin: '0 0 12px 0' }}>Joueurs connectés ({players.length})</h4>
              <div style={{
                display: 'grid',
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {players.map((p) => (
                    <div
                        key={p.id}
                        style={{
                          padding: '12px',
                          background: p.id === user?.id ? '#e3f2fd' : '#f8f9fa',
                          border: p.id === user?.id ? '2px solid #2196f3' : '1px solid #dee2e6',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: p.est_connecte ? '#28a745' : '#dc3545'
                    }}></span>
                        <strong>{p.pseudo}</strong>
                        {p.id === user?.id && <span style={{ color: '#666' }}>(moi)</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {p.role === 'host' && <span title="Hôte">⭐</span>}
                        {!p.est_connecte && <span title="Déconnecté">🔴</span>}
                      </div>
                    </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <button className="btn btn--ghost" type="button" onClick={handleLeave}>
                ← Quitter
              </button>

              {isHost ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", flex: 1 }}>
                    <button
                        className="btn"
                        type="button"
                        onClick={handleStart}
                        disabled={startButtonDisabled}
                        style={{
                          opacity: startButtonDisabled ? 0.6 : 1,
                          minWidth: '200px'
                        }}
                    >
                      {startButtonText}
                    </button>
                    {helpText && (
                        <div style={{
                          fontSize: "0.9em",
                          color: players.length >= 2 ? "#28a745" : "#666",
                          textAlign: "center",
                          fontWeight: players.length >= 2 ? 'bold' : 'normal'
                        }}>
                          {helpText}
                        </div>
                    )}
                  </div>
              ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    flex: 1
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {isGameStarted ? '🎯 Partie en cours - Redirection...' : '⏳ En attente de l\'hôte…'}
                    </div>
                    {players.length < 2 && (
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                          En attente de {2 - players.length} joueur(s) supplémentaire(s)
                        </div>
                    )}
                  </div>
              )}
            </div>

            {/* Instructions pour l'hôte */}
            {isHost && players.length < 2 && (
                <div style={{
                  padding: '12px',
                  background: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '8px',
                  fontSize: '0.9em'
                }}>
                  <strong>💡 Conseil :</strong> Partage le code <strong>{roomData?.code}</strong> avec d'autres joueurs pour qu'ils puissent rejoindre. Minimum 2 joueurs requis pour démarrer.
                </div>
            )}
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