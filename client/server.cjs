const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);

const rooms = new Map();

app.get("/health", (_req, res) => res.json({ ok: true, ws: true }));

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
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

  socket.on("room:join", ({ roomId, username, password, host }) => {
    if (!roomId) return;
    if (!rooms.has(roomId)) rooms.set(roomId, { hostId: null, pwd: password || "", players: [] });
    const room = rooms.get(roomId);

    if (host || !room.hostId) room.hostId = socket.id;

    const name = (username || "Joueur").toString().slice(0, 40);
    const already = room.players.find((p) => p.id === socket.id);
    if (!already) room.players.push({ id: socket.id, name });
    else already.name = name;

    socket.join(roomId);
    broadcastRoom(roomId);
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
    else broadcastRoom(roomId);
  });

  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms) {
      const before = room.players.length;
      room.players = room.players.filter((p) => p.id !== socket.id);
      if (before !== room.players.length) {
        if (room.hostId === socket.id) room.hostId = room.players[0]?.id || null;
        if (room.players.length === 0) rooms.delete(roomId);
        else broadcastRoom(roomId);
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`HTTP+WS on http://localhost:${PORT}`);
});
