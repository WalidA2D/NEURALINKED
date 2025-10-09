import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useGame } from "../../../context/GameContext.jsx";
import "./Puzzle1.css";

export default function Puzzle1() {
  const { roomId } = useParams();
  const { solvePuzzle } = useGame();

  const [message, setMessage] = useState(
    "🧠 Un souvenir d’Europe refait surface... Glisse deux couleurs dans le tube pour reconstituer le drapeau oublié."
  );
  const [mixedColor, setMixedColor] = useState(null);
  const [tubeColors, setTubeColors] = useState([]);
  const [flag, setFlag] = useState(["?", "?", "?"]);
  const [attempt, setAttempt] = useState(0);
  const [success, setSuccess] = useState(false);

  const baseColors = [
    { name: "Bleu clair", value: "#6EC1E4" },
    { name: "Rouge clair", value: "#F27C7C" },
    { name: "Jaune", value: "#F9E55B" },
    { name: "Gris", value: "#DADADA" },
    { name: "Vert", value: "#8BC34A" },
    { name: "Blanc", value: "#FFFFFF" },
  ];

  const correctFlag = ["#0047AB", "#FFFFFF", "#D90429"]; // bleu foncé, blanc, rouge

  function onDragStart(e, color) {
    e.dataTransfer.setData("color", color);
  }
  function allowDrop(e) { e.preventDefault(); }

  function dropInTube(e) {
    e.preventDefault();
    const color = e.dataTransfer.getData("color");
    if (!color) return;
    const newColors = [...tubeColors, color];
    if (newColors.length <= 2) {
      setTubeColors(newColors);
      if (newColors.length === 2) {
        mixColors(newColors);
      } else {
        setMessage("🧪 Choisis une autre couleur pour compléter ton mélange...");
      }
    }
  }

  function mixColors(pair) {
    const [c1, c2] = pair;
    let result = "#999";

    if (
      (c1 === "#6EC1E4" && c2 === "#DADADA") ||
      (c2 === "#6EC1E4" && c1 === "#DADADA")
    ) result = "#0047AB";
    else if (
      (c1 === "#F9E55B" && c2 === "#DADADA") ||
      (c2 === "#F9E55B" && c1 === "#DADADA")
    ) result = "#FFFFFF";
    else if (
      (c1 === "#F9E55B" && c2 === "#F27C7C") ||
      (c2 === "#F9E55B" && c1 === "#F27C7C")
    ) result = "#D90429";
    else result = "#BBBBBB";

    setMixedColor(result);
    setTubeColors([]);
    setMessage("🧠 Une nouvelle teinte de souvenir apparaît... glisse-la vers le drapeau !");
  }

  function dropOnFlag(e, index) {
    e.preventDefault();
    const color = e.dataTransfer.getData("color");
    if (!color) return;
    const newFlag = [...flag];
    newFlag[index] = color;
    setFlag(newFlag);
  }

  function validateFlag() {
    setAttempt((a) => a + 1);
    if (flag.join() === correctFlag.join()) {
      setSuccess(true);
      setMessage("✨ Les souvenirs se stabilisent... Un symbole d’unité européenne renaît dans ta mémoire.");
      // 🔑 propage à TOUTE la room
      solvePuzzle(1);
    } else {
      let hint = "❌ Ce n’est pas encore ça... ";
      if (attempt === 0) hint += "Ces couleurs évoquent un pays au cœur de l’Europe.";
      else if (attempt === 1) hint += "Un lieu où les lumières dansent sur un grand fleuve...";
      else hint += "On y trouve une tour de fer qui touche le ciel.";
      setMessage(hint);
    }
  }

  return (
    <section className="puzzle">
      <h2>Énigme 1 — Les Couleurs de la Mémoire</h2>
      <p className="message">{message}</p>

      <div className="color-palette">
        {baseColors.map((c, i) => (
          <div
            key={i}
            className="color-btn"
            style={{ backgroundColor: c.value }}
            draggable
            onDragStart={(e) => onDragStart(e, c.value)}
          ></div>
        ))}
      </div>

      <div className="mix-tube" onDrop={dropInTube} onDragOver={allowDrop}>
        <p>🔬 Glisse ici deux couleurs pour les mélanger</p>
        <div className="tube">
          {tubeColors.length > 0 ? (
            tubeColors.map((c, i) => (
              <div key={i} className="mini-color" style={{ backgroundColor: c }}></div>
            ))
          ) : mixedColor ? (
            <div
              className="mixed-color"
              style={{ backgroundColor: mixedColor }}
              draggable
              onDragStart={(e) => onDragStart(e, mixedColor)}
            ></div>
          ) : null}
        </div>
      </div>

      <div className="flag">
        {flag.map((c, i) => (
          <div
            key={i}
            className="flag-slot"
            style={{ backgroundColor: c !== "?" ? c : "#f5f5f5" }}
            onDrop={(e) => dropOnFlag(e, i)}
            onDragOver={allowDrop}
          >
            {c === "?" && "Dépose ici"}
          </div>
        ))}
      </div>

      <button className="btn-validate" onClick={validateFlag}>
        Valider
      </button>

      {success && (
        <p className="hint">En attente des autres… la suite arrive automatiquement.</p>
      )}
    </section>
  );
}
