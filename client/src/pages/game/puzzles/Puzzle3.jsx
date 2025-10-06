import { useGame } from "../../../context/GameContext.jsx";
export default function Puzzle3(){
  const { goToStep } = useGame();
  return (
    <section className="puzzle">
      <h2>Énigme 3 — Avant-dernière</h2>
      <p>Contenu de l’énigme 3…</p>
      <button className="btn" onClick={()=>goToStep(4)}>Valider & passer à l’énigme 4</button>
    </section>
  );
}
