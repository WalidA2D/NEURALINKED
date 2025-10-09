import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roomService } from "../services/roomService.js";

export default function Lobby() {
  const nav = useNavigate();
  const { user, token } = useAuth(); // Récupérer le token depuis le contexte
  const [createPwd, setCreatePwd] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPwd, setJoinPwd] = useState("");
  const [loading, setLoading] = useState({ create: false, join: false });
  const [error, setError] = useState("");

  const username = user?.pseudo || "Joueur";

  async function createGame(e) {
    e.preventDefault();
    setLoading(prev => ({ ...prev, create: true }));
    setError("");

    try {
      // Passer le token en deuxième paramètre
      const roomData = await roomService.createRoom(createPwd, token);
      console.log("✅ Partie créée:", roomData);

      // Rediriger vers la salle d'attente avec les vraies données
      nav(`/attente/${roomData.code}?host=1${createPwd ? `&pwd=${encodeURIComponent(createPwd)}` : ""}`);
    } catch (err) {
      console.error("❌ Erreur création partie:", err);
      setError(err.message || "Erreur lors de la création de la partie");
    } finally {
      setLoading(prev => ({ ...prev, create: false }));
    }
  }

  async function joinGame(e) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    setLoading(prev => ({ ...prev, join: true }));
    setError("");

    try {
      // Passer le token en troisième paramètre
      const roomData = await roomService.joinRoom(code, joinPwd, token);
      console.log("✅ Partie rejointe:", roomData);

      // Rediriger vers la salle d'attente
      nav(`/attente/${roomData.code}${joinPwd ? `?pwd=${encodeURIComponent(joinPwd)}` : ""}`);
    } catch (err) {
      console.error("❌ Erreur jonction partie:", err);
      setError(err.message || "Erreur lors de la jonction de la partie");
    } finally {
      setLoading(prev => ({ ...prev, join: false }));
    }
  }

  return (
      <div className="auth full-bleed">
        <main className="auth__panel">
          <header className="auth__header">
            <h1 className="auth__title">
              <span className="brand">NEURALINKED</span>
              <span className="sep"> – </span>
              <span className="subtitle">Lobby</span>
            </h1>
            <p className="auth__tagline">Créez ou rejoignez une partie. Le code permet d'inviter tes amis.</p>
          </header>

          {error && (
              <div className="auth__error" style={{ marginBottom: '16px' }}>
                {error}
              </div>
          )}

          <div className="auth__form" style={{ display: "grid", gap: 16 }}>
            {/* Créer une partie */}
            <form onSubmit={createGame} className="card">
              <h3>Créer une partie</h3>
              <label className="field">
                <span className="field__label">Mot de passe (optionnel)</span>
                <input
                    className="field__input"
                    placeholder="Laisser vide pour public"
                    value={createPwd}
                    onChange={(e) => setCreatePwd(e.target.value)}
                    disabled={loading.create}
                />
              </label>
              <button
                  className="btn"
                  type="submit"
                  disabled={loading.create}
              >
                {loading.create ? "Création..." : "Créer & aller en salle d'attente"}
              </button>
            </form>

            {/* Rejoindre une partie */}
            <form onSubmit={joinGame} className="card">
              <h3>Rejoindre une partie</h3>
              <label className="field">
                <span className="field__label">Code de la partie</span>
                <input
                    className="field__input"
                    placeholder="Ex: 7FQX2B"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    required
                    disabled={loading.join}
                />
              </label>
              <label className="field">
                <span className="field__label">Mot de passe (si requis)</span>
                <input
                    className="field__input"
                    placeholder="Mot de passe"
                    value={joinPwd}
                    onChange={(e) => setJoinPwd(e.target.value)}
                    disabled={loading.join}
                />
              </label>
              <button
                  className="btn"
                  type="submit"
                  disabled={loading.join}
              >
                {loading.join ? "Connexion..." : "Rejoindre"}
              </button>
            </form>
          </div>
        </main>

        <aside className="auth__art" aria-hidden="true" />
      </div>
  );
}