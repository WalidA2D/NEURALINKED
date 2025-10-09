import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
      <div className="home">
        {/* Effets de fond animés */}
        <div className="neural-grid" aria-hidden="true"></div>
        <div className="pulse-wave pulse-wave--1" aria-hidden="true"></div>
        <div className="pulse-wave pulse-wave--2" aria-hidden="true"></div>

        {/* Hero */}
        <main className="home__hero">
          <div className="glitch-container">
            <h1 className="home__title">
            <span className="brand">
              <span className="brand__neural">⚡</span>
              NEURALINKED
              <span className="brand__neural">⚡</span>
            </span>
            </h1>
            <div className="glitch-overlay" aria-hidden="true">NEURALINKED</div>
          </div>

          <h2 className="home__subtitle">
            <span className="subtitle__line"></span>
            Voyage dans la mémoire
            <span className="subtitle__line"></span>
          </h2>

          <p className="home__tagline">
            Plongez dans les souvenirs fragmentés. Restaurez les émotions perdues.<br/>
            <span className="tagline__warning">⚠️ Panne système détectée – Fragments mélangés</span>
          </p>

          <div className="home__cta">
            <Link className="btn btn--primary" to="/connexion">
              <span className="btn__icon">🧠</span>
              Se connecter au système
            </Link>
            <Link className="btn btn--ghost" to="/inscription">
              <span className="btn__icon">⚡</span>
              Créer un profil neural
            </Link>
          </div>

          <div className="home__stats">
            <div className="stat">
              <span className="stat__value">2-5</span>
              <span className="stat__label">Agents</span>
            </div>
            <div className="stat__divider"></div>
            <div className="stat">
              <span className="stat__value">10-15</span>
              <span className="stat__label">Minutes</span>
            </div>
            <div className="stat__divider"></div>
            <div className="stat">
              <span className="stat__value">∞</span>
              <span className="stat__label">Fragments</span>
            </div>
          </div>
        </main>

        {/* Particules flottantes */}
        <div className="particles" aria-hidden="true">
          {[...Array(15)].map((_, i) => (
              <div key={i} className="particle" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${8 + Math.random() * 12}s`
              }}></div>
          ))}
        </div>
      </div>
  );
}