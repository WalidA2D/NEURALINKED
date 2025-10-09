// NEURALINKED/client/server.cjs - Render-ready SANS Redis (single instance)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);

// --- CONFIG ---
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
const FORCE_WEB_SOCKET = (process.env.FORCE_WS || "0") === "1"; // optionnel

// --- STATE en mémoire (si pas de DB) ---
const rooms = new Map();

app.get("/health", (_req, res) => res.json({ ok: true, ws: true }));

// --- SOCKET.IO ---
const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin(origin, cb) {
      // Autoriser Postman/cURL (pas d'origin)
      if (!origin) return cb(null, true);

      // En prod, on limite aux origines autorisées si définies
      if (CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin not allowed: ${origin}`), false);
    },
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type"],
  },
  transports: FORCE_WEB_SOCKET ? ["websocket"] : ["websocket", "polling"],
  pingTimeout: 60_000,
  pingInterval: 25_000,
});

// ⬇️ Fetch dynamique (compat Node CJS)
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

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

io.on("connection", (socket) => {
  const ip = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
  console.log(`🔌 Nouvelle connexion: ${socket.id} depuis ${ip}`);

  socket.on("room:join", async ({ roomId, username, password, host }) => {
    if (!roomId) return;
    console.log(`🚪 room:join - ${username} rejoint ${roomId} (${socket.id})`);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { hostId: null, pwd: password || "", players: [] });
    }
    const room = rooms.get(roomId);

    if (host || !room.hostId) room.hostId = socket.id;

    const name = (username || "Joueur").toString().slice(0, 40);
    const already = room.players.find((p) => p.id === socket.id);
    if (!already) room.players.push({ id: socket.id, name });
    else already.name = name;

    socket.join(roomId);
    broadcastRoom(roomId);
  });

  socket.on("game:join", ({ roomId, username }) => {
    if (!roomId) return;
    console.log(`🎮 game:join - ${username} dans ${roomId} (${socket.id})`);
    socket.join(roomId);
  });

  socket.on("chat:load-history", async ({ roomId }) => {
    if (!roomId) return;
    console.log(`📥 Demande historique pour: ${roomId} par ${socket.id}`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${roomId}`);
      if (response.ok) {
        const history = await response.json();
        console.log(`✅ Envoi de ${history.length} messages à ${socket.id}`);
        socket.emit("chat:history", history);
      } else {
        console.error(`❌ API erreur ${response.status}`);
        socket.emit("chat:history", []);
      }
    } catch (error) {
      console.error("❌ Erreur chargement historique:", error.message);
      socket.emit("chat:history", []);
    }
  });

  // --- chat:message avec ACK pour remplacer le message "temp" côté client ---
  socket.on("chat:message", async (data, ack) => {
    const { roomId, user, text, ts } = data || {};
    if (!roomId || !user || !text) {
      console.error("❌ Données manquantes pour chat:message");
      return;
    }

    console.log(`💬 Message de ${user} (${socket.id}) dans ${roomId}: "${String(text).slice(0, 50)}"`);

    let message = {
      id: Date.now().toString(),
      user,
      text: text.toString().slice(0, 500),
      ts: ts || Date.now(),
    };

    // Sauvegarde DB (optionnelle)
    try {
      const dbResponse = await fetch(`${API_BASE_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_partie: roomId,
          contenu: text,
          type_message: "chat",
          user,
        }),
      });

      if (dbResponse.ok) {
        const saved = await dbResponse.json();
        if (saved?.id) message.id = saved.id;
        console.log(`💾 Message sauvegardé: ID ${message.id}`);
      } else {
        console.error(`❌ Erreur sauvegarde: ${dbResponse.status}`);
      }
    } catch (error) {
      console.error("❌ Erreur API:", error.message);
    }

    // DEBUG : qui est dans la room ?
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    console.log(
      `📤 Diffusion à ${roomSockets?.size || 0} socket(s) dans ${roomId}${
        roomSockets ? " → " + Array.from(roomSockets).join(", ") : ""
      }`
    );

    // 1) ACK vers l'émetteur pour swap le message temporaire
    if (typeof ack === "function") {
      try { ack(message); } catch {}
    }

    // 2) Diffusion à tous (émetteur inclus)
    io.in(roomId).emit("chat:message", message);
  });

  socket.on("chat:typing", ({ roomId, user, isTyping }) => {
    if (!roomId || !user) return;
    socket.to(roomId).emit("chat:typing", { user, isTyping });
  });

  socket.on("room:start", ({ roomId }) => {
    if (!roomId) return;
    console.log(`🚀 Démarrage de la partie: ${roomId}`);
    io.to(roomId).emit("room:start", { roomId });
  });

  socket.on("room:leave", ({ roomId }) => {
    if (!roomId) return;
    socket.leave(roomId);
    const room = rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== socket.id);
    if (room.hostId === socket.id) room.hostId = room.players[0]?.id || null;

    if (room.players.length === 0) {
      rooms.delete(roomId);
    } else {
      broadcastRoom(roomId);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Déconnexion: ${socket.id}`);
    for (const [roomId, room] of rooms) {
      const before = room.players.length;
      room.players = room.players.filter((p) => p.id !== socket.id);

      if (before !== room.players.length) {
        if (room.hostId === socket.id) {
          room.hostId = room.players[0]?.id || null;
        }
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          broadcastRoom(roomId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 HTTP+WebSocket démarré sur http://0.0.0.0:${PORT}`);
  console.log(`📡 Socket.io path: /socket.io`);
  console.log(`🌐 Accessible depuis d'autres machines (Render single instance)\n`);
});
