import { useNavigate } from "react-router-dom";
export default function Puzzle4(){
  const nav = useNavigate();
  function finish(){ nav("/lobby", { replace:true }); }
  return (
    <section className="puzzle">
      <h2>Énigme 4 — Finale</h2>
      <p>Contenu de l’énigme 4…</p>
      <button className="btn" onClick={finish}>Terminer la partie</button>
    </section>
  );
}
