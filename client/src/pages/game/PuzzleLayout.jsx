import { Outlet, useNavigate, useParams } from "react-router-dom";
import { GameProvider, useGame } from "../../context/GameContext.jsx";
import ChatPanel from "../../components/ChatPanel.jsx";
import { useEffect } from "react";

function Shell() {
  const { timeLeft, timeLeftMs, step, goToStep, players, endsAt } = useGame();
  const nav = useNavigate();
  const { roomId } = useParams();

  // Ne redirige vers le lobby que si le timer existe ET est terminé
  useEffect(() => {
    if (endsAt == null) return;
    if (timeLeftMs === 0) nav("/lobby", { replace: true });
  }, [endsAt, timeLeftMs, nav]);

  // Si on arrive directement par l’URL (/enigme/:num), on aligne le contexte
  useEffect(() => {
    const m = window.location.pathname.match(/\/enigme\/(\d+)/);
    const routeNum = m ? Number(m[1]) : 1;
    if (routeNum !== step) goToStep(routeNum);
  }, [step, goToStep]);

  return (
    <div className="game full-bleed">
      <header className="game__top">
        <div className="brand">
          NEURALINKED <span className="sep">–</span> <span className="subtitle">Énigmes</span>
        </div>
        <div className="game__meta">
          <div className="pill">Joueurs: {players?.length ?? 0}</div>
          <div className="pill pill--time">⏱ {timeLeft}</div>
        </div>
      </header>

      <div className="game__body">
        <nav className="game__steps">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className={`step ${step === n ? "active" : ""} ${n < step ? "done" : ""}`}
              type="button"
              onClick={() => {
                goToStep(n);
                nav(`/partie/${roomId}/enigme/${n}`);
              }}
            >
              Énigme {n}
            </button>
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
export default function PuzzleLayout() {
  const { roomId } = useParams();
  const username = localStorage.getItem("username") || "Joueur";

  return (
    <GameProvider roomId={roomId || "dev-room"} username={username}>
      <Shell />
    </GameProvider>
  );
}
