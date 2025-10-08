import express from "express";
import {
    createRoom,
    joinRoom,
    startRoom,
    getRoom,
    leaveRoom
} from '../controllers/roomController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes protégées
router.post("/create", authenticateToken, createRoom);
router.post("/join", authenticateToken, joinRoom);
router.post("/:roomId/start", authenticateToken, startRoom);
router.post("/:roomId/leave", authenticateToken, leaveRoom);
router.get("/:code", authenticateToken, getRoom);

export default router;