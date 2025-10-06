import { Outlet, useNavigate, useParams } from "react-router-dom";
import { GameProvider, useGame } from "../../context/GameContext.jsx";
import ChatPanel from "../../components/ChatPanel.jsx";
import { useEffect } from "react";

function Shell() {
  const { timeLeft, timeLeftMs, step, goToStep, players } = useGame();
  const nav = useNavigate();
  useEffect(() => {
    if (timeLeftMs === 0) nav("/lobby", { replace:true });
  }, [timeLeftMs, nav]);

  return (
    <div className="game full-bleed">
      <header className="game__top">
        <div className="brand">NEURALINKED <span className="sep">–</span> <span className="subtitle">Énigmes</span></div>
        <div className="game__meta">
          <div className="pill">Joueurs: {players.length}</div>
          <div className="pill pill--time">⏱ {timeLeft}</div>
        </div>
      </header>

      <div className="game__body">
        <nav className="game__steps">
          {[1,2,3,4].map(n=>(
            <button
              key={n}
              className={`step ${step===n ? "active":""} ${n<step ? "done":""}`}
              onClick={()=> goToStep(n)}
              type="button"
            >Énigme {n}</button>
          ))}
        </nav>

        <main className="game__content">
          <Outlet />
        </main>

        <ChatPanel />
      </div>
    </div>
  );
}

// Enveloppe la route avec GameProvider (roomId/username issus de params ou storage)
export default function PuzzleLayoutProvider() {
  const { roomId } = useParams();
  const username = localStorage.getItem("username") || "Joueur";
  return (
    <GameProvider roomId={roomId || "dev-room"} username={username}>
      <Shell />
    </GameProvider>
  );
}
