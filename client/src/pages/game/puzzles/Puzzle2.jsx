import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../../../context/GameContext.jsx";

export default function Puzzle2() {
  const { goToStep } = useGame();
  const nav = useNavigate();
  const { roomId } = useParams();

  function validate() {
    goToStep(3);
    nav(`/partie/${roomId}/enigme/3`);
  }

  return (
    <section className="puzzle">
      <h2>Énigme 2 — Suite</h2>
        <h2>Le Marché des Parfums </h2>
      <p>Contenu de l’énigme 2…</p>
      <button className="btn" onClick={validate}>
        Valider & passer à l’énigme 3
      </button>
    </section>
  );
}
