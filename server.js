const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Validation des variables d'environnement au démarrage
function validateEnvironment() {
    const required = ['OPENAI_API_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Variables d\'environnement manquantes:', missing);
        console.error('📋 Créez un fichier .env avec: OPENAI_API_KEY=votre_clé');
        process.exit(1);
    }
    
    // Vérifier le format de la clé OpenAI
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
        console.error('❌ Format de clé OpenAI invalide (doit commencer par sk-)');
        process.exit(1);
    }
    
    console.log('✅ Variables d\'environnement validées');
}

// Valider l'environnement au démarrage
validateEnvironment();

// Middleware pour traiter les requêtes JSON
app.use(express.json());

// Middleware de logging des requêtes (optionnel en dev)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
        next();
    });
}

// Servir les fichiers statiques
app.use(express.static('public'));

// Route pour la page d'accueil (joueurs)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour la page admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Route santé pour monitoring
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'science-squad-quiz',
        version: '2.0.0-gpt'
    });
});

// ===== NOUVELLES ROUTES GPT =====

// Route principale pour générer une question avec GPT
app.post('/api/generate-gpt-question', async (req, res) => {
    try {
        const { topic, difficulty, questionNumber, totalQuestions, sessionId, customPrompt } = req.body;
        
        // Validation améliorée des paramètres
        const validationError = validateQuestionRequest(req.body);
        if (validationError) {
            return res.status(400).json({
                error: 'Paramètres invalides',
                details: validationError,
                code: 'INVALID_PARAMETERS'
            });
        }

        // Importer le service GPT
        const triviaService = require('./server/src/services/triviaService');
        
        console.log(`🎯 Génération GPT - ${topic} (${difficulty}) - Question ${questionNumber}/${totalQuestions}`);
        
        // Générer la question avec le nouveau service
        const question = await triviaService.generateSingleQuestion(
            topic, 
            difficulty, 
            questionNumber, 
            totalQuestions, 
            sessionId || `session-${Date.now()}`
        );
        
        // Log de succès
        console.log(`✅ Question générée: "${question.question.substring(0, 50)}..."`);
        
        res.json({
            success: true,
            data: question,
            generated_at: new Date().toISOString(),
            service: 'gpt'
        });
        
    } catch (error) {
        console.error('❌ Erreur génération question GPT:', error);
        
        // Réponse d'erreur structurée selon le type d'erreur
        const errorResponse = {
            error: 'Erreur lors de la génération de la question',
            message: error.message,
            code: getErrorCode(error),
            timestamp: new Date().toISOString(),
            service: 'gpt'
        };
        
        // Code de statut HTTP selon le type d'erreur
        const statusCode = getHttpStatusFromError(error);
        
        res.status(statusCode).json(errorResponse);
    }
});

// Route de compatibilité pour l'ancienne API (DEPRECATED)
app.post('/api/generate-single-question', async (req, res) => {
    console.warn('⚠️ Route dépréciée /api/generate-single-question - Utilisez /api/generate-gpt-question');
    
    // Rediriger vers la nouvelle API GPT
    req.url = '/api/generate-gpt-question';
    return app._router.handle(req, res);
});

// Route pour générer plusieurs questions (batch)
app.post('/api/generate-questions-batch', async (req, res) => {
    try {
        const { topic, count, difficulty, sessionId } = req.body;
        
        if (!topic || !count || !difficulty) {
            return res.status(400).json({ 
                error: 'Paramètres manquants (topic, count, difficulty requis)',
                code: 'MISSING_PARAMETERS'
            });
        }

        if (count > 30) {
            return res.status(400).json({ 
                error: 'Maximum 30 questions par batch',
                code: 'BATCH_TOO_LARGE'
            });
        }

        const gptQuizService = require('./server/src/services/triviaService');
        const questions = [];
        const errors = [];
        
        console.log(`🔄 Génération batch de ${count} questions - ${topic}`);
        
        // Générer les questions en série pour éviter les rate limits
        for (let i = 1; i <= count; i++) {
            try {
                const question = await gptQuizService.generateSingleQuestion(
                    topic, difficulty, i, count, sessionId || `batch-${Date.now()}`
                );
                questions.push(question);
                
                // Petite pause entre les appels pour éviter les rate limits
                if (i < count) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
            } catch (error) {
                console.warn(`⚠️ Erreur question ${i}:`, error.message);
                errors.push({ questionNumber: i, error: error.message });
            }
        }
        
        console.log(`✅ Batch terminé: ${questions.length}/${count} questions générées`);
        
        res.json({
            success: true,
            data: questions,
            summary: {
                requested: count,
                generated: questions.length,
                errors: errors.length
            },
            errors: errors.length > 0 ? errors : undefined
        });
        
    } catch (error) {
        console.error('❌ Erreur génération batch:', error);
        res.status(500).json({
            error: 'Erreur lors de la génération du batch',
            message: error.message,
            code: 'BATCH_GENERATION_ERROR'
        });
    }
});

// Route pour obtenir des statistiques du service
app.get('/api/quiz-stats', (req, res) => {
    try {
        const gptQuizService = require('./server/src/services/triviaService');
        const stats = gptQuizService.QuestionMemory ? 
            new gptQuizService.QuestionMemory().getStats() : 
            { message: 'Statistiques non disponibles' };

        res.json({
            service: 'gpt-quiz-service',
            stats: stats,
            game_state: {
                active_games: gameState.gameActive ? 1 : 0,
                connected_players: gameState.players.size,
                admin_connected: gameState.admin !== null
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Erreur récupération statistiques',
            message: error.message
        });
    }
});

// ===== FONCTIONS UTILITAIRES =====

function validateQuestionRequest(body) {
    const { topic, difficulty, questionNumber, totalQuestions } = body;
    
    if (!topic?.trim()) {
        return 'Sujet requis et non vide';
    }
    
    if (topic.length > 100) {
        return 'Sujet trop long (max 100 caractères)';
    }
    
    if (!['facile', 'moyen', 'difficile'].includes(difficulty)) {
        return 'Difficulté invalide (facile, moyen, difficile)';
    }
    
    if (!Number.isInteger(questionNumber) || questionNumber < 1) {
        return 'Numéro de question invalide (entier >= 1)';
    }
    
    if (!Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 50) {
        return 'Nombre total invalide (1-50)';
    }
    
    if (questionNumber > totalQuestions) {
        return 'Numéro de question > total';
    }
    
    return null; // Pas d'erreur
}

function getErrorCode(error) {
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        return 'TIMEOUT_ERROR';
    }
    if (error.message.includes('API key') || error.message.includes('authentication')) {
        return 'AUTH_ERROR';
    }
    if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return 'RATE_LIMIT_ERROR';
    }
    if (error.message.includes('JSON') || error.message.includes('parsing')) {
        return 'PARSING_ERROR';
    }
    if (error.message.includes('validation') || error.message.includes('Validation')) {
        return 'VALIDATION_ERROR';
    }
    return 'GENERATION_ERROR';
}

function getHttpStatusFromError(error) {
    const code = getErrorCode(error);
    switch (code) {
        case 'TIMEOUT_ERROR': return 408;
        case 'AUTH_ERROR': return 401;
        case 'RATE_LIMIT_ERROR': return 429;
        case 'PARSING_ERROR': return 422;
        case 'VALIDATION_ERROR': return 400;
        default: return 500;
    }
}

// ===== GESTION WEBSOCKET (AMÉLIORÉE) =====

// État du jeu étendu avec gestion des sessions GPT
let gameState = {
    players: new Map(),
    admin: null,
    gameActive: false,
    currentSession: {
        id: null,
        topic: null,
        difficulty: null,
        totalQuestions: 0,
        startedAt: null
    },
    stats: {
        questionsGenerated: 0,
        gamesPlayed: 0,
        totalPlayers: 0
    }
};

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
    console.log('✅ Connexion WebSocket:', socket.id);

    // Envoyer l'état du jeu au nouveau client
    socket.emit('game-state', { 
        gameActive: gameState.gameActive,
        sessionInfo: gameState.currentSession 
    });

    // Rejoindre comme joueur
    socket.on('join-player', (data) => {
        if (gameState.gameActive) {
            socket.emit('join-rejected', { 
                reason: 'Game is already in progress',
                message: 'Une partie est déjà en cours. Veuillez attendre qu\'elle se termine.'
            });
            return;
        }

        // Validation des données joueur
        if (!data.name?.trim() || !data.avatar?.trim()) {
            socket.emit('join-rejected', {
                reason: 'Invalid player data',
                message: 'Nom et avatar requis'
            });
            return;
        }

        const player = {
            id: socket.id,
            name: data.name.trim().substring(0, 20), // Limiter la longueur
            avatar: data.avatar.trim(),
            lives: parseInt(process.env.LIVES_PER_PLAYER) || 3,
            score: 0,
            joinedAt: new Date().toISOString()
        };
        
        gameState.players.set(socket.id, player);
        gameState.stats.totalPlayers++;
        
        console.log(`👤 ${player.name} rejoint le jeu (Total: ${gameState.players.size})`);
        
        socket.emit('player-joined', player);
        io.emit('players-update', Array.from(gameState.players.values()));
    });

    // Reconnexion d'un joueur existant
    socket.on('rejoin-player', (data) => {
        if (gameState.gameActive) {
            socket.emit('join-rejected', { 
                reason: 'Game is already in progress',
                message: 'Une partie est déjà en cours. Veuillez attendre qu\'elle se termine.'
            });
            return;
        }

        const player = {
            id: socket.id,
            name: data.name?.trim().substring(0, 20) || 'Anonyme',
            avatar: data.avatar?.trim() || '😊',
            lives: parseInt(process.env.LIVES_PER_PLAYER) || 3,
            score: 0,
            joinedAt: new Date().toISOString(),
            reconnected: true
        };
        
        gameState.players.set(socket.id, player);
        console.log(`🔄 ${player.name} reconnecté (Total: ${gameState.players.size})`);
        
        socket.emit('player-rejoined', player);
        io.emit('players-update', Array.from(gameState.players.values()));
    });

    // Connexion admin
    socket.on('join-admin', () => {
        gameState.admin = socket.id;
        console.log('🔧 Admin connecté:', socket.id);
        
        socket.emit('admin-joined', {
            gameState: gameState.currentSession,
            stats: gameState.stats
        });
        socket.emit('players-update', Array.from(gameState.players.values()));
    });

    // Gestion des événements de partie depuis l'admin
    socket.on('game-started', (data) => {
        gameState.gameActive = true;
        gameState.currentSession = {
            id: `session-${Date.now()}`,
            topic: data.topic || 'sciences-generales',
            difficulty: data.difficulty || 'moyen',
            totalQuestions: data.totalQuestions || 10,
            startedAt: new Date().toISOString()
        };
        gameState.stats.gamesPlayed++;
        
        console.log(`🎮 Partie démarrée - Session: ${gameState.currentSession.id}`);
        
        // Notifier tous les clients
        io.emit('game-state', { gameActive: true, sessionInfo: gameState.currentSession });
        io.emit('game-started', { 
            ...data, 
            sessionId: gameState.currentSession.id 
        });
    });

    socket.on('game-ended', (data) => {
        gameState.gameActive = false;
        const sessionDuration = gameState.currentSession.startedAt ? 
            (new Date() - new Date(gameState.currentSession.startedAt)) / 1000 : 0;
        
        console.log(`🏁 Partie terminée - Durée: ${Math.round(sessionDuration)}s`);
        
        // Reset session
        gameState.currentSession = {
            id: null,
            topic: null,
            difficulty: null,
            totalQuestions: 0,
            startedAt: null
        };
        
        io.emit('game-state', { gameActive: false });
        io.emit('game-ended', { 
            ...data, 
            sessionDuration: Math.round(sessionDuration) 
        });
    });

    socket.on('game-reset', () => {
        gameState.gameActive = false;
        gameState.currentSession = {
            id: null,
            topic: null,
            difficulty: null,
            totalQuestions: 0,
            startedAt: null
        };
        
        console.log('🔄 Jeu réinitialisé');
        
        io.emit('game-state', { gameActive: false });
        io.emit('game-reset');
    });

    // Événements de questions (passthrough depuis l'admin)
    socket.on('question-displayed', (data) => {
        gameState.stats.questionsGenerated++;
        io.emit('question-displayed', {
            ...data,
            sessionId: gameState.currentSession.id
        });
    });

    socket.on('answer-revealed', (data) => {
        io.emit('answer-revealed', data);
    });

    // Gestion des réponses des joueurs
    socket.on('player-answer', (data) => {
        if (gameState.players.has(socket.id)) {
            const player = gameState.players.get(socket.id);
            
            console.log(`📝 Réponse de ${player.name}: ${data.answer} (Question ${data.questionIndex + 1})`);
            
            // Notifier l'admin de la réponse
            if (gameState.admin) {
                io.to(gameState.admin).emit('player-answer', {
                    player: player,
                    answer: data.answer,
                    questionIndex: data.questionIndex,
                    timestamp: new Date().toISOString()
                });
            }
        }
    });

    // Déconnexion
    socket.on('disconnect', () => {
        if (gameState.players.has(socket.id)) {
            const player = gameState.players.get(socket.id);
            gameState.players.delete(socket.id);
            console.log(`👋 ${player.name} déconnecté (Restants: ${gameState.players.size})`);
            io.emit('players-update', Array.from(gameState.players.values()));
        }
        
        if (gameState.admin === socket.id) {
            gameState.admin = null;
            console.log('🔧 Admin déconnecté');
            
            // Optionnel: pause automatique si admin se déconnecte en cours de partie
            if (gameState.gameActive) {
                console.log('⏸️ Partie mise en pause (admin déconnecté)');
                io.emit('game-paused', { reason: 'Admin disconnected' });
            }
        }
    });
});

// Gestion gracieuse de l'arrêt du serveur
process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du serveur...');
    server.close(() => {
        console.log('✅ Serveur fermé proprement');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Science Squad Quiz v2.0 (GPT) démarré sur http://localhost:${PORT}`);
    console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
});