import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../../../context/GameContext.jsx";
import "./Puzzle4.css";

export default function Puzzle4() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const { solvePuzzle } = useGame();

  const [fragments, setFragments] = useState({
    ville: false,
    parfum: false,
    chant: false,
  });

  const [activeQuestion, setActiveQuestion] = useState(null);
  const [message, setMessage] = useState("");

  const questions = {
    ville: {
      text: "Cette ville abrite une tour de fer célèbre dans le monde entier.",
      choices: ["Rome", "Paris", "Londres"],
      answer: "Paris",
    },
    parfum: {
      text: "Odeur fraîche utilisée dans le thé marocain.",
      choices: ["Vanille", "Menthe", "Jasmin"],
      answer: "Menthe",
    },
    chant: {
      text: "Complète le titre : 'Sous le ciel de ...'",
      choices: ["Marseille", "Paris", "Lisbonne"],
      answer: "Paris",
    },
  };

  function openQuestion(fragment) {
    if (!fragments[fragment]) {
      setActiveQuestion(fragment);
      setMessage("");
    }
  }

  function answerQuestion(choice) {
    const q = questions[activeQuestion];
    if (choice === q.answer) {
      setFragments((prev) => {
        const next = { ...prev, [activeQuestion]: true };
        // Si tout est résolu -> propage à la room
        if (Object.values(next).every(Boolean)) {
          // 🔑 propage la réussite de l’énigme 4
          solvePuzzle(4);
        }
        return next;
      });
      setMessage("✅ Bonne réponse !");
    } else {
      setMessage("❌ Mauvaise réponse, essaie encore !");
    }
  }

  const allSolved = Object.values(fragments).every(Boolean);

  function finish() {
    nav("/lobby", { replace: true });
  }

  return (
    <section className="puzzle4">
      <h2>🧠 Énigme 4 — Reconstruction du Souvenir</h2>
      <p className="intro">
        Rassemble les fragments du souvenir perdu. Résous chaque indice pour restaurer la mémoire de Paris.
      </p>

      <div className="fragments">
        <div
          className={`fragment ${fragments.ville ? "unlocked" : ""}`}
          onClick={() => openQuestion("ville")}
        >
          <img src="/images/ville.jpg" alt="Ville" />
          <p>Souvenir : Ville</p>
        </div>

        <div
          className={`fragment ${fragments.parfum ? "unlocked" : ""}`}
          onClick={() => openQuestion("parfum")}
        >
          <img src="/images/parfum.jpg" alt="Parfum" />
          <p>Souvenir : Parfum</p>
        </div>

        <div
          className={`fragment ${fragments.chant ? "unlocked" : ""}`}
          onClick={() => openQuestion("chant")}
        >
          <img src="/images/chant.jpg" alt="Chant" />
          <p>Souvenir : Chant</p>
        </div>
      </div>

      {activeQuestion && !fragments[activeQuestion] && (
        <div className="question-box">
          <h3>Indice</h3>
          <p>{questions[activeQuestion].text}</p>
          <div className="choices">
            {questions[activeQuestion].choices.map((c) => (
              <button key={c} onClick={() => answerQuestion(c)}>
                {c}
              </button>
            ))}
          </div>
          <p className="feedback">{message}</p>
          <button className="close" onClick={() => setActiveQuestion(null)}>Fermer</button>
        </div>
      )}

      {allSolved && (
        <div className="final">
          <h3>✨ Souvenir restauré !</h3>
          <p>
            Tu viens de réactiver le souvenir original de <strong>Paris</strong>.
            La Tour Eiffel brille à nouveau, l’air sent la <strong>menthe</strong>,
            et une douce chanson résonne : <em>"Sous le ciel de Paris..."</em>
          </p>
          <video src="/sounds/chant.mp4" controls autoPlay className="final-video" />
          <button className="btn" onClick={finish}>Terminer la partie</button>
        </div>
      )}
    </section>
  );
}
