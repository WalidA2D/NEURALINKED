import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "./Auth.css";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth(); // doit accepter (username, email, password)

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [err, setErr] = useState("");

  // ---- Validation mot de passe (normes actuelles)
  const policy = useMemo(() => {
    const local = form.email.split("@")[0] || "";
    return {
      minLen: form.password.length >= 12,              // >= 12 caractères
      lower: /[a-z]/.test(form.password),              // minuscule
      upper: /[A-Z]/.test(form.password),              // majuscule
      digit: /\d/.test(form.password),                 // chiffre
      special: /[^A-Za-z0-9]/.test(form.password),     // caractère spécial
      noSpace: !/\s/.test(form.password),              // pas d’espace
      notContainPII:
        form.password &&
        !form.password.toLowerCase().includes(form.username.toLowerCase()) &&
        !form.password.toLowerCase().includes(local.toLowerCase()), // n’inclut pas user/email
    };
  }, [form.password, form.username, form.email]);

  const score = useMemo(() => {
    // score simple 0..7
    return Object.values(policy).reduce((s, b) => s + (b ? 1 : 0), 0);
  }, [policy]);

  const emailChecks = useMemo(() => {
    const value = form.email.trim();
    const hasAt = value.includes("@");
    const basic = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    return { hasAt, basic, valid: hasAt && basic };
  }, [form.email]);

  const allOk = useMemo(() => {
    const every = Object.values(policy).every(Boolean);
    return (
      emailChecks.valid &&                      
      every &&
      form.password === form.confirm &&
      !!form.username &&
      !!form.email
    );
  }, [policy, form.password, form.confirm, form.username, form.email, emailChecks.valid]);

  
  async function submit(e) {
    e.preventDefault();
    if (!allOk) return;
    setErr("");
    try {
      await register(form.username.trim(), form.email.trim(), form.password);
      nav("/lobby");
    } catch (e) {
      setErr(e?.message || "Inscription impossible.");
    }
  }

  return (
    <div className="auth full-bleed">
      <main className="auth__panel">
        <header className="auth__header">
          <h1 className="auth__title">
            <span className="brand">NEURALINKED</span>
            <span className="sep"> – </span>
            <span className="subtitle">Inscription</span>
          </h1>
          <p className="auth__tagline">Créez votre accès et entrez dans la mémoire.</p>
        </header>

        <form className="auth__form" onSubmit={submit} autoComplete="on">
          <label className="field">
            <span className="field__label">E-mail</span>
            <input
              className={`field__input ${form.email && !emailChecks.valid ? "is-invalid" : ""}`}
              type="email"
              autoComplete="email"
              placeholder="exemple@mail.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              aria-invalid={!!form.email && !emailChecks.valid}
              required
            />
            <div className="field__hint">
              <span className={emailChecks.hasAt ? "ok" : "bad"}>Contient “@”</span>
              <span className={emailChecks.basic ? "ok" : "bad"}>Format valide</span>
            </div>
          </label>

          <label className="field">
            <span className="field__label">Nom d’utilisateur</span>
            <input
              className="field__input"
              type="text"
              autoComplete="username"
              placeholder="votre pseudo"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Mot de passe</span>
            <div className="field__password">
              <input
                className="field__input"
                type={show1 ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
              <button
                type="button"
                className="field__toggle"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShow1((s) => !s)}
                aria-pressed={show1}
                aria-label={show1 ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
              </button>
            </div>
          </label>

          <label className="field">
            <span className="field__label">Confirmer le mot de passe</span>
            <div className="field__password">
              <input
                className="field__input"
                type={show2 ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                required
              />
              <button
                type="button"
                className="field__toggle"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShow2((s) => !s)}
                aria-pressed={show2}
                aria-label={show2 ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
              </button>
            </div>
          </label>

          {/* Barre de robustesse */}
          <div className="pw-strength" aria-hidden="true">
            <div className={`pw-bar ${score >= 2 ? "on":""}`}></div>
            <div className={`pw-bar ${score >= 4 ? "on":""}`}></div>
            <div className={`pw-bar ${score >= 6 ? "on":""}`}></div>
            <div className={`pw-bar ${score >= 7 ? "on":""}`}></div>
          </div>

          {/* Checklist des règles */}
          <ul className="pw-checklist">
            <li className={policy.minLen ? "ok" : "bad"}>Au moins 12 caractères</li>
            <li className={policy.lower && policy.upper ? "ok" : "bad"}>Minuscules & majuscules</li>
            <li className={policy.digit ? "ok" : "bad"}>Au moins 1 chiffre</li>
            <li className={policy.special ? "ok" : "bad"}>Au moins 1 caractère spécial</li>
            <li className={policy.noSpace ? "ok" : "bad"}>Sans espace</li>
            <li className={policy.notContainPII ? "ok" : "bad"}>Ne contient pas votre pseudo/email</li>
            <li className={form.password && form.password === form.confirm ? "ok" : "bad"}>
              Les deux mots de passe sont identiques
            </li>
          </ul>

          {err && <p className="auth__error">{err}</p>}

          <button type="submit" className="btn auth__submit" disabled={!allOk}>
            Créer le compte
          </button>

          <p className="auth__alt">
            Déjà inscrit ? <Link to="/connexion" className="link">Connexion</Link>
          </p>
        </form>
      </main>
      <aside className="auth__art" aria-hidden="true" />
    </div>
  );
}
