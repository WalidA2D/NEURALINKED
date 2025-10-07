// server/src/config/database.js
import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

// Pool de connexions
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "neuralinked",
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

const db = pool.promise();

// Test de connexion
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Erreur de connexion à MySQL:", err.message);
        return;
    }
    console.log("✅ Connecté à MySQL avec succès");
    connection.release();
});

// ✅ Export ESM
export { pool, db };
