import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../../../context/GameContext.jsx";
import "./Puzzle3.css";

export default function Puzzle3() {
  const nav = useNavigate();
  const { roomId } = useParams(); // ✅ nécessaire
  const { goToStep } = useGame();

  const fragments = [
    { id: 1, nom: "Intro", audio: "/sounds/intro.mp3" },
    { id: 2, nom: "Refrain", audio: "/sounds/refrain.mp3" },
    { id: 3, nom: "Pont", audio: "/sounds/pont.mp3" },
    { id: 4, nom: "Final", audio: "/sounds/final.mp3" },
  ];

  const correctOrder = ["Intro", "Refrain", "Pont", "Final"];

  const [ordreFragments, setOrdreFragments] = useState([]);
  const [playing, setPlaying] = useState({});
  const [ordre, setOrdre] = useState({});
  const [message, setMessage] = useState("");
  const audioRefs = useRef({});
  const audioComplet = useRef(null);

  // Mélange aléatoire au démarrage
  useEffect(() => {
    const shuffled = [...fragments].sort(() => Math.random() - 0.5);
    setOrdreFragments(shuffled);
  }, []);

  // Lecture exclusive d'un fragment
  function toggleAudio(f) {
    const audio = audioRefs.current[f.nom];
    if (!audio) return;

    // Mettre tous les autres audios en pause
    Object.entries(audioRefs.current).forEach(([nom, a]) => {
      if (nom !== f.nom) {
        a.pause();
        a.currentTime = 0;
        setPlaying((prev) => ({ ...prev, [nom]: false }));
      }
    });

    // Lire ou mettre en pause le fragment sélectionné
    if (audio.paused) {
      audio.play();
      setPlaying((prev) => ({ ...prev, [f.nom]: true }));
    } else {
      audio.pause();
      setPlaying((prev) => ({ ...prev, [f.nom]: false }));
    }

    audio.onended = () => setPlaying((prev) => ({ ...prev, [f.nom]: false }));
  }

  // Gestion de l’ordre saisi
  function handleInputChange(id, value) {
    setOrdre((prev) => ({ ...prev, [id]: value }));
  }

  // Vérification du bon ordre
  function verifierOrdre() {
    const userOrder = Object.entries(ordre)
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => ordreFragments.find((f) => f.id === parseInt(id)).nom);

    if (JSON.stringify(userOrder) === JSON.stringify(correctOrder)) {
      // Pause tous les fragments
      Object.values(audioRefs.current).forEach((a) => {
        a.pause();
        a.currentTime = 0;
      });

      // Message + audio complet
      setMessage("🎉 Bravo ! Le chant complet joue maintenant !");
      goToStep(3);
      audioComplet.current?.play();
    } else {
      setMessage("❌ Mauvais ordre ! Essaie encore.");
    }
  }

  function passerEnigme() {
    nav(`/partie/${roomId}/enigme/4`, { replace: true }); // ✅ roomId présent
  }

  return (
    <section className="puzzle3">
      <h2 className="puzzle3-title">🎵 Énigme 3 — Les Voix du souvenir</h2>
      <p className="puzzle3-desc">
        Écoute les fragments du chant et indique leur ordre (1 à 4). <br />
        Un seul fragment peut être joué à la fois.
      </p>

      <div className="puzzle3-audios">
        {ordreFragments.map((f) => (
          <div
            key={f.id}
            className={`audio-card ${playing[f.nom] ? "playing" : ""}`}
          >
            <h3>{f.nom}</h3>
            <audio ref={(el) => (audioRefs.current[f.nom] = el)} src={f.audio} />
            <button
              onClick={() => toggleAudio(f)}
              className={`btn-audio ${playing[f.nom] ? "pause" : "play"}`}
            >
              {playing[f.nom] ? "⏸️ Pause" : "▶️ Lecture"}
            </button>

            <input
              type="number"
              min="1"
              max="4"
              value={ordre[f.id] || ""}
              onChange={(e) => handleInputChange(f.id, e.target.value)}
              className="ordre-input"
              placeholder="#"
            />
          </div>
        ))}
      </div>

      <button className="btn-validate" onClick={verifierOrdre}>
        ✅ Valider l’ordre
      </button>

      {message && (
        <p className={`puzzle3-msg ${message.includes("Bravo") ? "success" : "error"}`}>
          {message}
        </p>
      )}

      <audio ref={audioComplet} src="/sounds/complet.mp3" />

      {message.includes("Bravo") && (
        <button className="btn-next" onClick={passerEnigme}>
          Passer à l’énigme 4 ➡️
        </button>
      )}
    </section>
  );
}
