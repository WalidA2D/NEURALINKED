// NEURALINKED/client/server.cjs - VERSION COMPLÈTE CORRIGÉE
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

// ⬇️⬇️⬇️ FONCTION FETCH POUR NODE.JS ⬇️⬇️⬇️
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

io.on("connection", (socket) => {
  console.log(`🔌 Nouvelle connexion: ${socket.id}`);

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

  socket.on("room:join", async ({ roomId, username, password, host }) => {
    console.log(`🚪 room:join - ${username} rejoint ${roomId}`);

    if (!roomId) return;
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

    // Charger l'historique depuis l'API
    try {
      console.log(`📥 Chargement historique pour: ${roomId}`);
      const response = await fetch(`http://localhost:3001/api/messages/${roomId}`);

      if (response.ok) {
        const history = await response.json();
        console.log(`✅ ${history.length} messages chargés`);
        socket.emit("chat:history", history);
      } else {
        console.error(`❌ API erreur ${response.status}`);
        socket.emit("chat:history", []);
      }
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error.message);
      socket.emit("chat:history", []);
    }

    broadcastRoom(roomId);
  });

  socket.on("game:join", async ({ roomId, username }) => {
    console.log(`🎮 game:join - ${username} dans ${roomId}`);

    if (!roomId) return;
    socket.join(roomId);

    // Charger l'historique
    try {
      const response = await fetch(`http://localhost:3001/api/messages/${roomId}`);
      if (response.ok) {
        const history = await response.json();
        console.log(`✅ Historique jeu: ${history.length} messages`);
        socket.emit("chat:history", history);
      } else {
        socket.emit("chat:history", []);
      }
    } catch (error) {
      console.error('❌ Erreur historique jeu:', error.message);
      socket.emit("chat:history", []);
    }
  });

  socket.on("chat:message", async (data) => {
    const { roomId, user, text, ts } = data;

    console.log(`💬 Message de ${user} dans ${roomId}: "${text?.substring(0, 50)}"`);

    if (!roomId || !user || !text) {
      console.error('❌ Données manquantes');
      return;
    }

    const message = {
      id: Date.now().toString(),
      user,
      text: text.toString().slice(0, 500),
      ts: ts || Date.now(),
    };

    // Sauvegarder en DB
    try {
      const dbResponse = await fetch('http://localhost:3001/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_partie: roomId,
          contenu: text,
          type_message: 'chat',
          user: user
        })
      });

      if (dbResponse.ok) {
        const savedMessage = await dbResponse.json();
        console.log(`💾 Message sauvegardé: ID ${savedMessage.id}`);
        message.id = savedMessage.id;
      } else {
        console.error(`❌ Erreur sauvegarde: ${dbResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur API:', error.message);
    }

    // Diffuser à tous dans la room
    console.log(`📤 Diffusion à ${io.sockets.adapter.rooms.get(roomId)?.size || 0} joueurs`);
    io.to(roomId).emit("chat:message", message);
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
httpServer.listen(PORT, () => {
  console.log(`\n🚀 HTTP+WebSocket démarré sur http://localhost:${PORT}`);
  console.log(`📡 Socket.io path: /socket.io\n`);
});