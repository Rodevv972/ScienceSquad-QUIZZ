const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizdb'; // Mets à jour selon ton .env ou config
const client = new MongoClient(uri, { useUnifiedTopology: true });

let db;

/**
 * Connexion à la base MongoDB quizdb (singleton)
 * Utilise la même connexion pour toutes les requêtes du service
 */
async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db(); // Par défaut, prend la DB du URI (ici quizdb)
    }
    return db;
}

module.exports = { connectDB, client };