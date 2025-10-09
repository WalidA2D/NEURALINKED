// src/components/ChatPanel.jsx
import { useEffect, useRef, useState } from "react";
import { useGame } from "../context/GameContext.jsx";

export default function ChatPanel() {
    const { messages, sendMessage, typing, setTypingState, username, connected } = useGame();
    const [text, setText] = useState("");
    const listRef = useRef(null);
    const typingUsers = Object.entries(typing).filter(([u, v]) => v && u !== username).map(([u]) => u);

    // Debug : afficher les messages reçus
    useEffect(() => {
        console.log(`📨 [ChatPanel] ${messages.length} messages en mémoire:`, messages);
    }, [messages]);

    // Auto-scroll
    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    function submit(e) {
        e.preventDefault();
        const v = text.trim();
        if (!v) {
            console.warn("⚠️ [ChatPanel] Message vide");
            return;
        }

        console.log(`📤 [ChatPanel] Envoi message: "${v}" par ${username}`);
        sendMessage(v);
        setText("");
        setTypingState(false);
    }

    return (
        <aside className="game__chat">
            <div className="game__chat__head">
                <h3>Chat {connected ? "🟢" : "🔴"}</h3>
                <small style={{ opacity: 0.6, fontSize: "0.8em" }}>
                    {messages.length} message{messages.length > 1 ? "s" : ""}
                </small>
            </div>

            <div className="game__chat__list" ref={listRef}>
                {messages.length === 0 ? (
                    <div style={{ padding: "1rem", textAlign: "center", opacity: 0.5 }}>
                        Aucun message pour le moment
                    </div>
                ) : (
                    messages.map((m, i) => (
                        <div key={m.id || i} className={`msg ${m.user === username ? "me" : ""}`}>
                            <div className="user">{m.user || "Anonyme"}</div>
                            <div className="bubble">{m.text}</div>
                            <small style={{ opacity: 0.5, fontSize: "0.7em" }}>
                                {new Date(m.ts).toLocaleTimeString()}
                            </small>
                        </div>
                    ))
                )}
            </div>

            <div className="game__chat__typing">
                {typingUsers.length > 0 && <em>{typingUsers.join(", ")} écrit...</em>}
            </div>

            <form className="game__chat__form" onSubmit={submit}>
                <input
                    className="field__input"
                    placeholder="Écrire un message…"
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        setTypingState(true);
                    }}
                    onBlur={() => setTypingState(false)}
                />
                <button className="btn" type="submit" disabled={!connected}>
                    Envoyer
                </button>
            </form>
        </aside>
    );
}