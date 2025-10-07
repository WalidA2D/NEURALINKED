import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// ping
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// auth routes:
import authRoutes from "./src/routes/authRoutes.js";

// Routes d'authentification
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));