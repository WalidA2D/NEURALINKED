import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../../context/GameContext.jsx";
import "./Puzzle2.css";

export default function Puzzle2() {
  const nav = useNavigate();
  const { goToStep } = useGame();

  // --- Les 8 flacons avec emojis et lettres du mot COMPLEXE ---
  const flaconsRaw = [
    { nom: "🌸", lettre: "C" }, // Fleur
    { nom: "🍎", lettre: "O" }, // Fruit
    { nom: "🧂", lettre: "M" }, // Sel
    { nom: "🗑️", lettre: "P" }, // Poubelle
    { nom: "💐", lettre: "L" }, // Parfum
    { nom: "🕯️", lettre: "E" }, // Encens
    { nom: "❌", lettre: "X" }, // Xylène
    { nom: "🌶️", lettre: "E" }, // Épice
  ];

  // Mélange aléatoire des flacons (exécuté une seule fois)
  const flacons = useMemo(() => {
    const arr = [...flaconsRaw];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const [revealed, setRevealed] = useState(Array(flacons.length).fill(false));
  const allRevealed = revealed.every(Boolean);

  const [mot, setMot] = useState("");
  const [motValide, setMotValide] = useState(false);
  const [message, setMessage] = useState("");
  const [choixFinal, setChoixFinal] = useState("");
  const [choixValide, setChoixValide] = useState(false);

  function playSound(name) {
    try {
      const a = new Audio(`/sounds/${name}.mp3`);
      a.volume = 0.6;
      a.play().catch(() => {});
    } catch (e) {}
  }

  function flipFlacon(index) {
    if (revealed[index]) return;
    const next = [...revealed];
    next[index] = true;
    setRevealed(next);
    playSound("flip");
    if (next.every((r) => r)) setTimeout(() => playSound("allrevealed"), 350);
  }

  function handleChange(e) {
    setMot(e.target.value);
  }

  function validerMot() {
    const cleaned = mot.trim().toUpperCase();
    if (cleaned === "COMPLEXE") {
      setMotValide(true);
      setMessage(
        "Certaines odeurs sont complexes. Réfléchis bien pour deviner laquelle l’utilisateur a senti."
      );
      playSound("success");
      goToStep(2);
    } else {
      const lettresRestantes = "COMPLEXE".length - cleaned.length;
      const indice =
        lettresRestantes > 0
          ? `💡 Il te manque encore ${lettresRestantes} lettre${
              lettresRestantes > 1 ? "s" : ""
            }.`
          : "Regarde bien l'ordre des lettres !";
      setMessage(`Ce n'est pas le bon mot. ${indice}`);
      playSound("error");
    }
  }

  function validerChoix() {
    if (!motValide) {
      setMessage("D'abord, trouve et valide le mot clé.");
      return;
    }
    if (choixFinal === "Parfum") {
      setChoixValide(true);
      setMessage(
        "🌿 Bravo ! Tu as réveillé la mémoire olfactive : l’utilisateur a senti un parfum."
      );
      playSound("success2");
    } else {
      setChoixValide(false);
      setMessage("Ce n’est pas la bonne odeur... réessaie.");
      playSound("error");
    }
  }

  function passerEnigme() {
    nav("/puzzle3", { replace: true });
  }

  return (
    <section className="puzzle2">
      <h2>Énigme 2 — Le Souvenir parfumé 🌸</h2>

      {/* si pas encore trouvé l'odeur */}
      {!choixValide && (
        <>
          <p className="intro">
            Devant toi, huit flacons gardent des traces d’un souvenir
            olfactif.<br />
            Clique sur chacun pour le retourner et découvrir la lettre cachée au
            dos.<br />
            Les lettres ne sont pas dans l’ordre — à toi de reconstituer le
            mot-clé.<br />
            💡 <strong>Indice :</strong> le mot à trouver commence par la lettre{" "}
            <strong>C</strong>.
          </p>

          {/* flacons visibles tant que l’énigme n’est pas finie */}
          <div className="flacons">
            {flacons.map((f, i) => (
              <div
                key={i}
                className={`flacon ${revealed[i] ? "revealed" : ""}`}
                onClick={() => flipFlacon(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") flipFlacon(i);
                }}
                aria-pressed={revealed[i]}
                aria-label={`Flacon ${f.nom}`}
              >
                <div className="flacon-inner">
                  <div className="flacon-front">
                    <div className="flacon-name">{f.nom}</div>
                  </div>
                  <div className="flacon-back">
                    <div className="flacon-letter">{f.lettre}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* saisie du mot */}
          {allRevealed && !motValide && (
            <div className="zone-mot">
              <p className="mot-instruction">
                Toutes les lettres ont été révélées. Écris le mot complet
                correspondant au souvenir.
              </p>
              <div className="saisie-mot">
                <input
                  type="text"
                  placeholder="Tape le mot ici"
                  value={mot}
                  onChange={handleChange}
                  onKeyDown={(e) => e.key === "Enter" && validerMot()}
                  autoFocus
                />
                <button className="btn-valider-mot" onClick={validerMot}>
                  Valider le mot
                </button>
              </div>
            </div>
          )}

          {/* choix de l’odeur */}
          {motValide && (
            <div className="zone-choix">
              <p className="instruction-choix">{message}</p>

              <div className="choix-odeur">
                {["Fleur", "Fruit", "Sel", "Poubelle", "Parfum"].map((f) => (
                  <button
                    key={f}
                    className={`btn-odeur ${
                      choixFinal === f ? "selected" : ""
                    }`}
                    onClick={() => setChoixFinal(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="actions-choix">
                <button className="btn-validate-choice" onClick={validerChoix}>
                  Valider le choix
                </button>
              </div>
            </div>
          )}

          {message && <p className="message">{message}</p>}
        </>
      )}

      {/* Écran final uniquement quand l’odeur est trouvée */}
      {motValide && choixValide && (
        <div className="celebration">
          <p>
            🌸 Souvenir restauré — tu as réveillé une mémoire olfactive
            essentielle.
          </p>
          <button className="btn-next" onClick={passerEnigme}>
            Continuer → Énigme 3
          </button>
        </div>
      )}
    </section>
  );
}
