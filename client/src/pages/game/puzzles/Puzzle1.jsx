import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../../../context/GameContext.jsx";
import "./Puzzle1.css";

export default function Puzzle1() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const { goToStep } = useGame();

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
  { name: "Vert", value: "#8BC34A" },
  { name: "Blanc", value: "#FFFFFF" },
  { name: "Orange", value: "#FFA500" },
  { name: "Violet", value: "#8A2BE2" },
];


  const correctFlag = ["#0047AB", "#FFFFFF", "#D90429"]; // bleu foncé, blanc, rouge

  function onDragStart(e, color) {
    e.dataTransfer.setData("color", color);
  }

  function allowDrop(e) {
    e.preventDefault();
  }

  // Déposer une couleur dans le tube
  function dropInTube(e) {
    e.preventDefault();
    const color = e.dataTransfer.getData("color");
    if (!color) return;
    const newColors = [...tubeColors, color];
    if (newColors.length <= 2) {
      setTubeColors(newColors);
      if (newColors.length === 2) {
        // Mélange automatique après 2 couleurs
        mixColors(newColors);
      } else {
        setMessage("🧪 Choisis une autre couleur pour compléter ton mélange...");
      }
    }
  }

function mixColors(pair) {
  const [c1, c2] = pair;
  let result;

  // Bleu foncé (Bleu clair + Violet)
  if (
    (c1 === "#6EC1E4" && c2 === "#8A2BE2") ||
    (c2 === "#6EC1E4" && c1 === "#8A2BE2")
  )
    result = "#0047AB";

  // Rouge foncé (Rouge clair + Orange)
  else if (
    (c1 === "#F27C7C" && c2 === "#FFA500") ||
    (c2 === "#F27C7C" && c1 === "#FFA500")
  )
    result = "#D90429";

  // Vert (Bleu clair + Jaune)
  else if (
    (c1 === "#6EC1E4" && c2 === "#F9E55B") ||
    (c2 === "#6EC1E4" && c1 === "#F9E55B")
  )
    result = "#4CAF50";

  // Orange clair (Rouge clair + Jaune)
  else if (
    (c1 === "#F27C7C" && c2 === "#F9E55B") ||
    (c2 === "#F27C7C" && c1 === "#F9E55B")
  )
    result = "#FF8C42";

  // Violet clair (Rouge clair + Bleu clair)
  else if (
    (c1 === "#F27C7C" && c2 === "#6EC1E4") ||
    (c2 === "#F27C7C" && c1 === "#6EC1E4")
  )
    result = "#A569BD";

  // Jaune clair (Jaune + Blanc)
  else if (
    (c1 === "#F9E55B" && c2 === "#FFFFFF") ||
    (c2 === "#F9E55B" && c1 === "#FFFFFF")
  )
    result = "#FFF59D";

  // Rouge clair (Rouge clair + Blanc)
  else if (
    (c1 === "#F27C7C" && c2 === "#FFFFFF") ||
    (c2 === "#F27C7C" && c1 === "#FFFFFF")
  )
    result = "#FFA6A6";

  // Bleu clair (Bleu clair + Blanc)
  else if (
    (c1 === "#6EC1E4" && c2 === "#FFFFFF") ||
    (c2 === "#6EC1E4" && c1 === "#FFFFFF")
  )
    result = "#AED6F1";

  // Vert clair (Vert + Blanc)
  else if (
    (c1 === "#8BC34A" && c2 === "#FFFFFF") ||
    (c2 === "#8BC34A" && c1 === "#FFFFFF")
  )
    result = "#C8E6C9";

  // Orange clair (Orange + Blanc)
  else if (
    (c1 === "#FFA500" && c2 === "#FFFFFF") ||
    (c2 === "#FFA500" && c1 === "#FFFFFF")
  )
    result = "#FFCD8C";

  // Violet clair (Violet + Blanc)
  else if (
    (c1 === "#8A2BE2" && c2 === "#FFFFFF") ||
    (c2 === "#8A2BE2" && c1 === "#FFFFFF")
  )
    result = "#B685E6";

  // Mélanges secondaires Gris + Couleur pour adoucir
  else if (c1 === "#DADADA") result = c2;
  else if (c2 === "#DADADA") result = c1;

  // Mélanges de la même couleur → même couleur
  else if (c1 === c2) result = c1;

  setMixedColor(result);
  setTubeColors([]);
  setMessage(
    "🧠 Une nouvelle teinte de souvenir apparaît... glisse-la vers le drapeau !"
  );
}



  // Déposer une couleur sur le drapeau
  function dropOnFlag(e, index) {
    e.preventDefault();
    const color = e.dataTransfer.getData("color");
    if (!color) return;
    const newFlag = [...flag];
    newFlag[index] = color;
    setFlag(newFlag);
  }

  // Vérification du drapeau
  function validateFlag() {
    setAttempt((a) => a + 1);
    if (flag.join() === correctFlag.join()) {
      setSuccess(true);
      setMessage(
        "✨ Les souvenirs se stabilisent... Un symbole d’unité européenne renaît dans ta mémoire."
      );
    } else {
      let hint = "❌ Ce n’est pas encore ça... ";
      if (attempt === 0) hint += "Ces couleurs évoquent un pays au cœur de l’Europe.";
      else if (attempt === 1) hint += "Un lieu où les lumières dansent sur un grand fleuve...";
      else hint += "On y trouve une tour de fer qui touche le ciel.";
      setMessage(hint);
    }
  }

  function finish() {
    goToStep(1);
    nav(`/partie/${roomId}/enigme/2`, { replace: true }); // ✅ backticks + roomId
  }

  return (
    <section className="puzzle">
      <h2>Énigme 1 — Les Couleurs de la Mémoire</h2>
      <p className="message">{message}</p>

      {/* Palette de base */}
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

      {/* Tube de mélange */}
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

      {/* Drapeau */}
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
        <button className="btn-finish" onClick={finish}>
          Continuer →
        </button>
      )}
    </section>
  );
}
