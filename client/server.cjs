// server.cjs
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);

const rooms = new Map();
// room state = {
//   hostId, pwd, players: [{id,name}], 
//   step: number,            // étape courante (1..4, etc.)
//   endsAt: number|null,     // timestamp ms pour le timer
//   solved: { [puzzleNum]: true }  // énigmes validées
// }

app.get("/health", (_req, res) => res.json({ ok: true, ws: true }));

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

function getOrInitRoom(roomId, init = {}) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      hostId: null,
      pwd: init.password || "",
      players: [],
      step: 1,
      endsAt: null,
      solved: {},
    });
  }
  return rooms.get(roomId);
}

function broadcastRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("room:update", {
    code: roomId,
    pwd: room.pwd,
    players: room.players,
    hostId: room.hostId,
  });
}

function broadcastGameState(roomId, partial = {}) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("game:state", {
    step: room.step,
    endsAt: room.endsAt,
    players: room.players,
    ...partial,
  });
}

io.on("connection", (socket) => {
  // ======= LOBBY / ROOMS =======
  socket.on("room:join", ({ roomId, username, password, host }) => {
    if (!roomId) return;
    const room = getOrInitRoom(roomId, { password });

    if (host || !room.hostId) room.hostId = socket.id;

    const name = (username || "Joueur").toString().slice(0, 40);
    const already = room.players.find((p) => p.id === socket.id);
    if (!already) room.players.push({ id: socket.id, name });
    else already.name = name;

    socket.join(roomId);

    broadcastRoom(roomId);
    // pousser aussi l'état de jeu au nouveau venu
    socket.emit("game:state", { step: room.step, endsAt: room.endsAt, players: room.players });
  });

  socket.on("room:start", ({ roomId }) => {
    if (!roomId) return;
    io.to(roomId).emit("room:start", { roomId });
  });

  socket.on("room:leave", ({ roomId }) => {
    if (!roomId) return;
    socket.leave(roomId);
    const room = rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== socket.id);
    if (room.hostId === socket.id) room.hostId = room.players[0]?.id || null;

    if (room.players.length === 0) rooms.delete(roomId);
    else {
      broadcastRoom(roomId);
      broadcastGameState(roomId);
    }
  });

  // ======= LOGIQUE DE JEU =======
  // Rejoint le canal de jeu (depuis GameContext)
  socket.on("game:join", ({ roomId, username }) => {
    if (!roomId) return;
    const room = getOrInitRoom(roomId);

    // s'assurer que le joueur est connu (si vient direct sur /partie)
    if (!room.players.find(p => p.id === socket.id)) {
      const name = (username || "Joueur").toString().slice(0, 40);
      room.players.push({ id: socket.id, name });
      broadcastRoom(roomId);
    }

    socket.join(roomId);
    socket.emit("game:state", { step: room.step, endsAt: room.endsAt, players: room.players });
  });

  // Timer poussé par le premier client
  socket.on("game:timer", ({ roomId, endsAt }) => {
    if (!roomId || !endsAt) return;
    const room = getOrInitRoom(roomId);
    if (!room.endsAt) {
      room.endsAt = endsAt;
      broadcastGameState(roomId, { endsAt: room.endsAt });
    }
  });

  // Navigation d’étape "manuelle" (boutons)
  socket.on("game:step", ({ roomId, step }) => {
    if (!roomId || !step) return;
    const room = getOrInitRoom(roomId);
    // on n'autorise pas le retour en arrière
    room.step = Math.max(room.step, Number(step));
    broadcastGameState(roomId);
    io.to(roomId).emit("game:step", { step: room.step });
  });

  // Quand UNE personne a validé une énigme -> toute la room passe à l’étape suivante
  socket.on("puzzle:solved", ({ roomId, puzzle, by }) => {
    if (!roomId || puzzle == null) return;
    const room = getOrInitRoom(roomId);

    const pz = Number(puzzle);
    if (!room.solved[pz]) {
      room.solved[pz] = true;
      room.step = Math.max(room.step, pz + 1);
      io.to(roomId).emit("game:puzzle-solved", { puzzle: pz, by: by || "Quelqu’un" });
      broadcastGameState(roomId);
      io.to(roomId).emit("game:step", { step: room.step });
    }
  });

  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms) {
      const before = room.players.length;
      room.players = room.players.filter((p) => p.id !== socket.id);
      if (before !== room.players.length) {
        if (room.hostId === socket.id) room.hostId = room.players[0]?.id || null;
        if (room.players.length === 0) rooms.delete(roomId);
        else {
          broadcastRoom(roomId);
          broadcastGameState(roomId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`HTTP+WS on http://localhost:${PORT}`);
});
