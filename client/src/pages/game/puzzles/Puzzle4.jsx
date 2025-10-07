import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../../../context/GameContext.jsx";

export default function Puzzle4() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const { goToStep } = useGame();

  function finish() {
    // (optionnel) figer l'étape au final
    goToStep(4);
    nav("/lobby", { replace: true });
  }

  return (
    <section className="puzzle">
      <h2>Énigme 4 — Finale</h2>
      <p>Contenu de l’énigme 4…</p>
      <button className="btn" onClick={finish}>Terminer la partie</button>
    </section>
  );
}
