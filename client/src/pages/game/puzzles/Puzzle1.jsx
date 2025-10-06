import { useGame } from "../../../context/GameContext.jsx";
export default function Puzzle1(){
  const { goToStep } = useGame();
  function validate(){ goToStep(2); }
  return (
    <section className="puzzle">
      <h2>Énigme 1 — Démarrage</h2>
      <p>Place ici le contenu/contexte de l’énigme 1.</p>
      <button className="btn" onClick={validate}>Valider & passer à l’énigme 2</button>
    </section>
  );
}
