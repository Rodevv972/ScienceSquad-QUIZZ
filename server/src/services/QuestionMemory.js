const { connectDB } = require('./mongoClient');

class QuestionMemory {
    constructor() {
        this.sessionQuestions = new Map(); // Questions par session (pour rapidité locale)
        this.globalHashes = new Set(); // Hashes globaux pour statistiques et rapidité
        this.recentTopics = []; // Sujets récents pour hints anti-répétition
    }

    generateQuestionHash(question, options) {
        // Crée un hash basé sur les mots-clés principaux de la question et des options
        const content = (question + options.join(' ')).toLowerCase();
        const keywords = content.match(/\b\w{4,}\b/g) || [];
        return keywords.slice(0, 5).sort().join('-');
    }

    async isQuestionUsed(sessionId, question, options) {
        const hash = this.generateQuestionHash(question, options);

        // Vérifie dans MongoDB si la question existe déjà (évite les doublons globaux)
        const db = await connectDB();
        const found = await db.collection('pastQuestion').findOne({ hash });
        if (found) {
            console.log('🔍 Question détectée comme répétition dans MongoDB (pastQuestion)');
            return true;
        }

        // Vérifie aussi dans la session courante (utile pour rapidité et tests)
        const sessionQuestions = this.sessionQuestions.get(sessionId) || new Set();
        if (sessionQuestions.has(hash)) {
            console.log('🔍 Question détectée comme répétition dans la session');
            return true;
        }

        return false;
    }

    async markQuestionUsed(sessionId, question, options) {
        const hash = this.generateQuestionHash(question, options);

        // Ajout local pour la session
        if (!this.sessionQuestions.has(sessionId)) {
            this.sessionQuestions.set(sessionId, new Set());
        }
        this.sessionQuestions.get(sessionId).add(hash);

        // Ajout global pour stats locales
        this.globalHashes.add(hash);

        // Ajout dans MongoDB (upsert)
        const db = await connectDB();
        await db.collection('pastQuestion').updateOne(
            { hash },
            {
                $set: {
                    hash,
                    question,
                    options,
                    sessionId,
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );

        // Extraction du sujet principal pour gestion anti-répétition
        const questionWords = question.toLowerCase().match(/\b\w{5,}\b/g) || [];
        if (questionWords.length > 0) {
            this.recentTopics.push(questionWords[0]);
            if (this.recentTopics.length > 10) {
                this.recentTopics.shift(); // On garde les 10 derniers sujets seulement
            }
        }
    }

    getRecentQuestions() {
        return this.recentTopics;
    }

    clearSession(sessionId) {
        this.sessionQuestions.delete(sessionId);
        console.log(`🧹 Mémoire de session ${sessionId} nettoyée`);
    }

    getStats() {
        const totalSessions = this.sessionQuestions.size;
        const totalQuestions = this.globalHashes.size;
        return { totalSessions, totalQuestions };
    }
}

module.exports = { QuestionMemory };