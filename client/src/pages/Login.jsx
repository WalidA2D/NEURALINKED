import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "./Auth.css";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth(); // doit accepter (identifier, password)
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");

    try {
      localStorage.setItem("mockAuth", "1");
    } catch {}

    console.log("[DEV] forçage navigation vers /lobby");
    nav("/lobby", { replace: true });
  }

  
  return (
    <div className="auth full-bleed">
      <main className="auth__panel">
        <header className="auth__header">
          <h1 className="auth__title">
            <span className="brand">NEURALINKED</span>
            <span className="sep"> – </span>
            <span className="subtitle">Connexion</span>
          </h1>
          <p className="auth__tagline">Reprenez le voyage dans la mémoire.</p>
        </header>

        <form className="auth__form" onSubmit={submit} autoComplete="on">
          {/* IDENTIFIANT: email OU nom d'utilisateur */}
          <label className="field">
            <span className="field__label">Identifiant</span>
            <input
              className="field__input"
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="email ou nom d’utilisateur"
              value={form.identifier}
              onChange={(e) =>
                setForm((f) => ({ ...f, identifier: e.target.value }))
              }
              required
            />
          </label>

          {/* MOT DE PASSE + TOGGLE AFFICHER/MASQUER */}
          <label className="field">
            <span className="field__label">Mot de passe</span>
            <div className="field__password">
              <input
                className="field__input"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                required
              />
              <button
                type="button"
                className="field__toggle"
                onMouseDown={(e) => e.preventDefault()} /* évite le blur */
                onClick={() => setShow((s) => !s)}
                aria-pressed={show}
                aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                title={show ? "Masquer" : "Afficher"}
              >
              </button>
            </div>
          </label>

          {err && <p className="auth__error">{err}</p>}

          <button type="submit" className="btn auth__submit">Se connecter</button>

          <p className="auth__alt">
            Pas de compte ? <Link to="/inscription" className="link">Créer un compte</Link>
          </p>
        </form>
      </main>
      <aside className="auth__art" aria-hidden="true" />
    </div>
  );
}
