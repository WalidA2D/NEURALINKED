import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="home">

      {/* Hero */}
      <main className="home__hero">
        <h1 className="home__title">
          <span className="brand">NEURALINKED</span>
          <span className="sep"> – </span>
          <span className="subtitle">Voyage dans la mémoire</span>
        </h1>

        <p className="home__tagline">
          Réparez des fragments émotionnels et évadez-vous du système.
        </p>

        <div className="home__cta">
          <Link className="btn" to="/connexion">Se connecter</Link>
          <Link className="btn btn--ghost" to="/inscription">Créer un compte</Link>
        </div>
      </main>
    </div>
  );
}
