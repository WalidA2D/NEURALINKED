import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateRoomCode } from "../utils/room.js";

export default function Lobby() {
  const nav = useNavigate();
  const [createPwd, setCreatePwd] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPwd, setJoinPwd] = useState("");

  const username = localStorage.getItem("username") || "Joueur";

  function createGame(e){
  e.preventDefault();
  try { localStorage.setItem("mockAuth", "1"); } catch {}
  const code = generateRoomCode();
  nav(`/attente/${code}?host=1${createPwd ? `&pwd=${encodeURIComponent(createPwd)}`:""}`);
}

  function joinGame(e){
  e.preventDefault();
  const code = joinCode.trim().toUpperCase();
  if (!code) return;
  try { localStorage.setItem("mockAuth", "1"); } catch {}
  nav(`/attente/${code}${joinPwd ? `?pwd=${encodeURIComponent(joinPwd)}`:""}`);
}

  return (
    <div className="auth full-bleed">
      <main className="auth__panel">
        <header className="auth__header">
          <h1 className="auth__title"><span className="brand">NEURALINKED</span><span className="sep"> – </span><span className="subtitle">Lobby</span></h1>
          <p className="auth__tagline">Créez ou rejoignez une partie. Le code permet d’inviter tes amis.</p>
        </header>

        <div className="auth__form" style={{ display:"grid", gap:16 }}>
          {/* Créer une partie */}
          <form onSubmit={createGame} className="card">
            <h3>Créer une partie</h3>
            <label className="field">
              <span className="field__label">Mot de passe (optionnel)</span>
              <input
                className="field__input"
                placeholder="Laisser vide pour public"
                value={createPwd}
                onChange={(e)=> setCreatePwd(e.target.value)}
              />
            </label>
            <button className="btn">Créer & aller en salle d’attente</button>
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
                onChange={(e)=> setJoinCode(e.target.value.toUpperCase())}
                required
              />
            </label>
            <label className="field">
              <span className="field__label">Mot de passe (si requis)</span>
              <input
                className="field__input"
                placeholder="Mot de passe"
                value={joinPwd}
                onChange={(e)=> setJoinPwd(e.target.value)}
              />
            </label>
            <button className="btn">Rejoindre</button>
          </form>
        </div>
      </main>

      <aside className="auth__art" aria-hidden="true" />
    </div>
  );
}
