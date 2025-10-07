import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../../../context/GameContext.jsx";

export default function Puzzle3() {
  const { goToStep } = useGame();
  const nav = useNavigate();
  const { roomId } = useParams();

  function validate() {
    goToStep(4);
    nav(`/partie/${roomId}/enigme/4`);
  }

  return (
    <section className="puzzle">
      <h2>Énigme 3 — Avant-dernière</h2>
      <p>Contenu de l’énigme 3…</p>
      <button className="btn" onClick={validate}>
        Valider & passer à l’énigme 4
      </button>
    </section>
  );
}
