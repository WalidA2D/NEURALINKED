import { useGame } from "../../../context/GameContext.jsx";
export default function Puzzle2(){
  const { goToStep } = useGame();
  return (
    <section className="puzzle">
      <h2>Énigme 2 — Suite</h2>
      <p>Contenu de l’énigme 2…</p>
      <button className="btn" onClick={()=>goToStep(3)}>Valider & passer à l’énigme 3</button>
    </section>
  );
}
