// server/test-db.js
import { db } from "./src/config/database.js";

async function testConnection() {
    try {
        console.log("🧪 Test de connexion à la base de données...");

        const [rows] = await db.execute("SELECT 1 + 1 AS result");
        console.log("✅ Test de calcul basique réussi:", rows[0].result);

        const [dbRows] = await db.execute("SELECT DATABASE() as db_name");
        console.log("✅ Base de données connectée:", dbRows[0].db_name);

        const [tables] = await db.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = 'neuralinked'
    `);
        console.log("✅ Tables trouvées:", tables.map(t => t.TABLE_NAME));

        const [enigmes] = await db.execute("SELECT COUNT(*) as count FROM Enigme");
        console.log(`✅ ${enigmes[0].count} énigmes chargées`);

        console.log("🎉 Tous les tests de connexion sont réussis !");
        process.exit(0);
    } catch (error) {
        console.error("❌ Erreur de connexion:", error.message);
        console.log("💡 Vérifiez que:");
        console.log("   - MySQL est démarré");
        console.log("   - La base 'neuralinked' existe");
        console.log("   - Les identifiants dans .env sont corrects");
        process.exit(1);
    }
}

testConnection();
