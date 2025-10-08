// src/components/
import { useEffect, useRef, useState } from "react";
import { useGame } from "../context/GameContext.jsx";

export default function ChatPanel() {
  const { messages, sendMessage, typing, setTypingState, username, connected } = useGame();
  const [text, setText] = useState("");
  const listRef = useRef(null);
  const typingUsers = Object.entries(typing).filter(([u, v]) => v && u !== username).map(([u]) => u);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior:"smooth" });
  }, [messages]);

  function submit(e){
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    sendMessage(v);
    setText("");
    setTypingState(false);
  }

  return (
    <aside className="game__chat">
      <div className="game__chat__head">
        <h3>Chat {connected ? "🟢" : "🔴"}</h3>
      </div>
      <div className="game__chat__list" ref={listRef}>
        {messages.map((m,i)=>(
          <div key={i} className={`msg ${m.user===username ? "me" : ""}`}>
            <div className="user">{m.user}</div>
            <div className="bubble">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="game__chat__typing">
        {typingUsers.length>0 && <em>{typingUsers.join(", ")} écrit...</em>}
      </div>
      <form className="game__chat__form" onSubmit={submit}>
        <input
          className="field__input"
          placeholder="Écrire un message…"
          value={text}
          onChange={(e)=>{ setText(e.target.value); setTypingState(true); }}
          onBlur={()=> setTypingState(false)}
        />
        <button className="btn" type="submit">Envoyer</button>
      </form>
    </aside>
  );
}
