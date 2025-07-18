// ───────────────────────────────
//  ADMIN.JS v2.0 – Génération GPT à la volée
// ───────────────────────────────

// ────────────────   CLASSES UTILITAIRES
class TimerManager {
    constructor() {
        this.timers = new Map();
        this.debugMode = localStorage.getItem('timer-debug') === 'true';
    }
    
    createTimer(id, callback, interval) {
        this.clearTimer(id); // Nettoyer l'ancien s'il existe
        
        const timer = setInterval(callback, interval);
        this.timers.set(id, {
            timer: timer,
            created: Date.now(),
            interval: interval
        });
        
        if (this.debugMode) {
            console.log(`⏰ Timer créé: ${id} (${interval}ms)`);
        }
        return timer;
    }
    
    clearTimer(id) {
        const timerData = this.timers.get(id);
        if (timerData) {
            clearInterval(timerData.timer);
            this.timers.delete(id);
            if (this.debugMode) {
                console.log(`🗑️ Timer nettoyé: ${id}`);
            }
        }
    }
    
    clearAllTimers() {
        for (const [id, timerData] of this.timers) {
            clearInterval(timerData.timer);
            if (this.debugMode) {
                console.log(`🗑️ Timer nettoyé: ${id}`);
            }
        }
        this.timers.clear();
        console.log('🧹 Tous les timers admin nettoyés');
    }
    
    getActiveTimers() {
        return Array.from(this.timers.keys());
    }
    
    getStats() {
        return {
            active: this.timers.size,
            timers: Array.from(this.timers.entries()).map(([id, data]) => ({
                id,
                uptime: Date.now() - data.created,
                interval: data.interval
            }))
        };
    }
}

// ────────────────   GESTIONNAIRE D'ERREURS
class ErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.lastErrors = [];
    }
    
    handleError(error, context = '') {
        this.errorCount++;
        const errorInfo = {
            message: error.message,
            context: context,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        
        this.lastErrors.push(errorInfo);
        if (this.lastErrors.length > 10) {
            this.lastErrors.shift(); // Garder seulement les 10 dernières
        }
        
        console.error(`❌ [${context}]`, error);
        return errorInfo;
    }
    
    getErrorStats() {
        return {
            total: this.errorCount,
            recent: this.lastErrors.slice(-5)
        };
    }
}

// ────────────────   INSTANCES GLOBALES
const socket = io();
const timerManager = new TimerManager();
const errorHandler = new ErrorHandler();

// ────────────────   ÉTAT AMÉLIORÉ
let gameState = {
    questionConfig: null,
    currentQuestionIndex: 0,
    gameActive: false,
    showingAnswer: false,
    sessionId: null,
    currentQuestion: null,
    stats: {
        questionsGenerated: 0,
        errors: 0,
        avgGenerationTime: 0
    }
};

// ────────────────   RÉFÉRENCES DOM
const statusDiv = document.getElementById('status');
const generateBtn = document.getElementById('generate-questions-btn');
const startGameBtn = document.getElementById('start-game-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const showAnswerBtn = document.getElementById('show-answer-btn');
const endGameBtn = document.getElementById('end-game-btn');
const resetAllBtn = document.getElementById('reset-all-btn');

// ────────────────   INITIALISATION
document.addEventListener('DOMContentLoaded', () => {
    initializeButtons();
    initializeSocketEvents();
    initializeErrorHandling();
    socket.emit('join-admin');
    
    // Debug console commande
    if (window.location.hash === '#debug') {
        enableDebugMode();
    }
});

// ────────────────   GESTION DES ERREURS GLOBALES
function initializeErrorHandling() {
    window.addEventListener('error', (event) => {
        errorHandler.handleError(event.error, 'Global Error');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        errorHandler.handleError(new Error(event.reason), 'Unhandled Promise');
    });
}

// ────────────────   MODE DEBUG
function enableDebugMode() {
    localStorage.setItem('timer-debug', 'true');
    console.log('🐛 Mode debug activé');
    
    // Commandes debug globales
    window.adminDebug = {
        timers: () => timerManager.getStats(),
        errors: () => errorHandler.getErrorStats(),
        gameState: () => gameState,
        clearTimers: () => timerManager.clearAllTimers(),
        testError: () => { throw new Error('Test error'); }
    };
}

// ────────────────   BOUTONS
function initializeButtons() {
    generateBtn.onclick = configureQuiz;
    startGameBtn.onclick = startGame;
    nextQuestionBtn.onclick = nextQuestion;
    showAnswerBtn.onclick = showAnswer;
    endGameBtn.onclick = endGame;
    resetAllBtn.onclick = resetAll;
    
    document.getElementById('question-topic')
        .addEventListener('change', handleTopicChange);
}

// ────────────────   GESTION DU DOMAINE PERSONNALISÉ
function handleTopicChange() {
    const topicSelect = document.getElementById('question-topic');
    const customTopicGroup = document.getElementById('custom-topic-group');
    
    if (topicSelect.value === 'personnalise') {
        customTopicGroup.style.display = 'block';
        document.getElementById('custom-topic').focus();
    } else {
        customTopicGroup.style.display = 'none';
        document.getElementById('custom-topic').value = '';
    }
}

// ────────────────   CONFIGURATION AMÉLIORÉE
function configureQuiz() {
    try {
        const topicSelect = document.getElementById('question-topic');
        const customTopic = document.getElementById('custom-topic');
        const count = +document.getElementById('question-count').value;
        const difficulty = document.getElementById('question-difficulty').value;

        let topic = topicSelect.value === 'personnalise'
            ? customTopic.value.trim()
            : topicSelect.value;

        // Validation améliorée
        if (!topic) {
            return showStatus('Sélectionnez un sujet', 'error');
        }
        
        if (topic.length > 100) {
            return showStatus('Nom du sujet trop long (max 100 caractères)', 'error');
        }
        
        if (count < 1 || count > 30) {
            return showStatus('Nombre de questions entre 1 et 30', 'error');
        }

        // Générer un ID de session unique
        const sessionId = `admin-session-${Date.now()}`;
        
        gameState.questionConfig = { 
            topic, 
            count, 
            difficulty,
            sessionId,
            createdAt: new Date().toISOString()
        };
        
        gameState.sessionId = sessionId;
        gameState.stats.questionsGenerated = 0;
        gameState.stats.errors = 0;

        document.getElementById('questions-count').textContent = count;
        startGameBtn.disabled = false;
        showStatus('Configuration enregistrée ✔️', 'success');
        updateGameStatus(`Configuration prête - ${topic} (${difficulty}, ${count}Q)`);
        
        console.log('📝 Configuration quiz:', gameState.questionConfig);
        
    } catch (error) {
        errorHandler.handleError(error, 'Configuration Quiz');
        showStatus('Erreur lors de la configuration', 'error');
    }
}

// ────────────────   DÉMARRER
function startGame() {
    try {
        if (!gameState.questionConfig) {
            return showStatus("Configurez d'abord le quiz", 'error');
        }

        gameState.gameActive = true;
        gameState.currentQuestionIndex = 0;
        gameState.showingAnswer = false;

        // Interface
        startGameBtn.disabled = true;
        generateBtn.disabled = true;
        nextQuestionBtn.disabled = false;
        endGameBtn.disabled = false;

        updateGameStatus('Partie en cours - Génération de la première question...');

        // Notifier le serveur
        socket.emit('game-started', {
            topic: gameState.questionConfig.topic,
            difficulty: gameState.questionConfig.difficulty,
            totalQuestions: gameState.questionConfig.count,
            sessionId: gameState.sessionId
        });

        // Commencer immédiatement
        showCurrentQuestion();
        
        console.log('🎮 Partie démarrée avec session:', gameState.sessionId);
        
    } catch (error) {
        errorHandler.handleError(error, 'Démarrage Partie');
        showStatus('Erreur lors du démarrage', 'error');
    }
}

// ────────────────   GÉNÉRATION GPT AMÉLIORÉE
async function generateOneQuestion() {
    const startTime = Date.now();
    const cfg = gameState.questionConfig;
    const n = gameState.currentQuestionIndex + 1;
    
    // Calcul de difficulté progressive
    const diff = cfg.difficulty === 'progressif'
        ? (n <= cfg.count / 3 ? 'facile' :
           n <= cfg.count * 2 / 3 ? 'moyen' : 'difficile')
        : cfg.difficulty;

    console.log(`🔄 Génération question ${n}/${cfg.count} - ${cfg.topic} (${diff})`);

    // Nouvelle API GPT
    const response = await fetch('/api/generate-gpt-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            topic: cfg.topic,
            difficulty: diff,
            questionNumber: n,
            totalQuestions: cfg.count,
            sessionId: gameState.sessionId
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error (${response.status}): ${errorData.message || 'Génération échouée'}`);
    }

    const result = await response.json();
    const generationTime = Date.now() - startTime;
    
    // Mise à jour des stats
    gameState.stats.questionsGenerated++;
    gameState.stats.avgGenerationTime = 
        (gameState.stats.avgGenerationTime * (gameState.stats.questionsGenerated - 1) + generationTime) / 
        gameState.stats.questionsGenerated;

    console.log(`✅ Question générée en ${generationTime}ms`);
    
    return result.data || result; // Support des deux formats de réponse
}

// ────────────────   AFFICHER QUESTION AMÉLIORÉE
async function showCurrentQuestion() {
    const card = document.getElementById('current-question-card');
    card.style.display = 'block';
    
    // Interface de loading
    document.getElementById('question-text').textContent = '⏳ Génération GPT en cours...';
    document.getElementById('question-options').innerHTML = '<div class="loading-spinner">🔄 Génération...</div>';
    
    // Nettoyer les timers précédents
    timerManager.clearTimer('question-timer');

    try {
        const question = await generateOneQuestion();

        // Validation de la réponse
        if (!question || !question.question || !Array.isArray(question.options)) {
            throw new Error('Format de réponse invalide');
        }

        // Affichage de la question
        document.getElementById('question-counter').textContent =
            `Question ${gameState.currentQuestionIndex + 1}/${gameState.questionConfig.count}`;
        document.getElementById('current-question-number').textContent =
            `${gameState.currentQuestionIndex + 1}/${gameState.questionConfig.count}`;
        document.getElementById('question-text').textContent = question.question;

        // Options avec validation
        const opts = document.getElementById('question-options');
        if (question.options.length !== 4) {
            throw new Error(`Nombre d'options invalide: ${question.options.length} (attendu: 4)`);
        }
        
        opts.innerHTML = question.options.map((opt, i) => `
            <div class="question-option" data-index="${i}">
                ${String.fromCharCode(65 + i)}. ${opt}
            </div>
        `).join('');

        // Reset interface
        document.getElementById('question-answer').style.display = 'none';
        showAnswerBtn.disabled = false;
        nextQuestionBtn.disabled = true;
        gameState.showingAnswer = false;
        gameState.currentQuestion = question;

        // Notifier les clients
        socket.emit('question-displayed', {
            questionIndex: gameState.currentQuestionIndex,
            question: question.question,
            options: question.options,
            timeLimit: 10,
            sessionId: gameState.sessionId
        });

        // Démarrer le timer
        startQuestionTimer();
        
        updateGameStatus(`Question ${gameState.currentQuestionIndex + 1}/${gameState.questionConfig.count} affichée`);

    } catch (error) {
        const errorInfo = errorHandler.handleError(error, 'Génération Question');
        gameState.stats.errors++;
        
        showStatus(`Erreur de génération: ${error.message}`, 'error');
        
        // Interface d'erreur
        document.getElementById('question-text').textContent = '❌ Erreur de génération';
        document.getElementById('question-options').innerHTML = `
            <div class="error-message">
                <p>Impossible de générer la question</p>
                <button onclick="showCurrentQuestion()" class="btn btn-primary">🔄 Réessayer</button>
                <button onclick="nextQuestion()" class="btn btn-secondary">⏭️ Question suivante</button>
            </div>
        `;
        
        // Désactiver les contrôles
        showAnswerBtn.disabled = true;
        nextQuestionBtn.disabled = false;
    }
}

// ────────────────   TIMER ANIMÉ AMÉLIORÉ
function startQuestionTimer() {
    let timeLeft = 10;
    const timerSeconds = document.getElementById('timer-seconds');
    const timerProgress = document.querySelector('.timer-progress');
    const timerContainer = document.querySelector('.timer-container');
    
    // Réinitialiser l'interface timer
    resetTimerUI(timerProgress, timerSeconds, timerContainer, timeLeft);
    
    // Créer le timer avec TimerManager
    timerManager.createTimer('question-timer', () => {
        updateTimerDisplay(timeLeft, timerSeconds, timerProgress);
        
        timeLeft--;
        
        if (timeLeft < 0) {
            timerManager.clearTimer('question-timer');
            handleTimerExpiration(timerSeconds, timerProgress, timerContainer);
        }
    }, 1000);
}

function resetTimerUI(timerProgress, timerSeconds, timerContainer, timeLeft) {
    if (timerProgress) {
        timerProgress.style.strokeDashoffset = '0';
        timerProgress.classList.remove('warning', 'danger');
    }
    
    if (timerSeconds) {
        timerSeconds.classList.remove('warning', 'danger');
        timerSeconds.textContent = timeLeft;
    }
    
    if (timerContainer) {
        timerContainer.classList.remove('timer-expired');
    }
}

function updateTimerDisplay(timeLeft, timerSeconds, timerProgress) {
    if (timerSeconds) {
        timerSeconds.textContent = Math.max(0, timeLeft);
    }
    
    // Animation du cercle
    const percentage = (Math.max(0, timeLeft) / 10) * 100;
    if (timerProgress) {
        timerProgress.style.strokeDashoffset = 100 - percentage;
    }
    
    // États visuels
    const elements = [timerProgress, timerSeconds].filter(Boolean);
    elements.forEach(element => {
        element.classList.remove('warning', 'danger');
        
        if (timeLeft <= 3) {
            element.classList.add('danger');
        } else if (timeLeft <= 5) {
            element.classList.add('warning');
        }
    });
}

function handleTimerExpiration(timerSeconds, timerProgress, timerContainer) {
    if (timerSeconds) {
        timerSeconds.textContent = '0';
    }
    if (timerProgress) {
        timerProgress.style.strokeDashoffset = '100';
    }
    if (timerContainer) {
        timerContainer.classList.add('timer-expired');
    }
    
    console.log('⏰ Timer de question expiré');
}

// ────────────────   AFFICHER RÉPONSE
function showAnswer() {
    try {
        // Arrêter le timer
        timerManager.clearTimer('question-timer');

        if (!gameState.currentQuestion) {
            throw new Error('Aucune question active');
        }

        const q = gameState.currentQuestion;
        const correctIndex = q.correct;

        // Marquer les réponses
        document.querySelectorAll('.question-option').forEach((el, i) => {
            el.classList.remove('correct', 'incorrect');
            el.classList.add(i === correctIndex ? 'correct' : 'incorrect');
        });

        // Afficher l'explication
        const answerDiv = document.getElementById('question-answer');
        answerDiv.innerHTML = `
            <div class="answer-content">
                <p><strong>✅ Réponse correcte :</strong> ${q.options[correctIndex]}</p>
                <div class="explanation">
                    <strong>💡 Explication :</strong> ${q.explanation}
                </div>
                ${q.source_hint ? `<div class="source-hint"><strong>📚 Pour aller plus loin :</strong> ${q.source_hint}</div>` : ''}
            </div>
        `;
        answerDiv.style.display = 'block';

        // Mise à jour des contrôles
        showAnswerBtn.disabled = true;
        nextQuestionBtn.disabled = false;
        gameState.showingAnswer = true;

        // Notifier les clients
        socket.emit('answer-revealed', {
            correctAnswer: correctIndex,
            explanation: q.explanation,
            sourceHint: q.source_hint
        });

        updateGameStatus(`Réponse affichée - Question ${gameState.currentQuestionIndex + 1}/${gameState.questionConfig.count}`);
        
    } catch (error) {
        errorHandler.handleError(error, 'Affichage Réponse');
        showStatus('Erreur lors de l\'affichage de la réponse', 'error');
    }
}

// ────────────────   QUESTION SUIVANTE
function nextQuestion() {
    try {
        gameState.currentQuestionIndex++;
        
        if (gameState.currentQuestionIndex >= gameState.questionConfig.count) {
            return endGame();
        }
        
        showCurrentQuestion();
        
    } catch (error) {
        errorHandler.handleError(error, 'Question Suivante');
        showStatus('Erreur lors du passage à la question suivante', 'error');
    }
}

// ────────────────   TERMINER LA PARTIE
function endGame() {
    try {
        // Nettoyer tous les timers
        timerManager.clearAllTimers();
        
        gameState.gameActive = false;
        
        // Interface
        document.getElementById('current-question-card').style.display = 'none';
        
        startGameBtn.disabled = false;
        generateBtn.disabled = false;
        nextQuestionBtn.disabled = true;
        showAnswerBtn.disabled = true;
        endGameBtn.disabled = true;
        
        const finalStats = `Partie terminée - ${gameState.stats.questionsGenerated} questions générées (${gameState.stats.errors} erreurs)`;
        updateGameStatus(finalStats);
        
        // Notifier les clients
        socket.emit('game-ended', {
            totalQuestions: gameState.questionConfig.count,
            stats: gameState.stats,
            sessionId: gameState.sessionId
        });
        
        console.log('🏁 Partie terminée:', gameState.stats);
        
    } catch (error) {
        errorHandler.handleError(error, 'Fin de Partie');
        showStatus('Erreur lors de la fin de partie', 'error');
    }
}

// ────────────────   RÉINITIALISER
function resetAll() {
    if (!confirm('Êtes-vous sûr de vouloir tout réinitialiser?')) {
        return;
    }
    
    try {
        // Nettoyer tous les timers
        timerManager.clearAllTimers();
        
        // Réinitialiser le formulaire
        document.getElementById('question-topic').value = '';
        document.getElementById('custom-topic').value = '';
        document.getElementById('custom-topic-group').style.display = 'none';
        document.getElementById('question-count').value = '10';
        document.getElementById('question-difficulty').value = 'moyen';
        
        // Reset état
        gameState = {
            questionConfig: null,
            currentQuestionIndex: 0,
            gameActive: false,
            showingAnswer: false,
            sessionId: null,
            currentQuestion: null,
            stats: {
                questionsGenerated: 0,
                errors: 0,
                avgGenerationTime: 0
            }
        };
        
        // Interface
        document.getElementById('questions-count').textContent = '0';
        document.getElementById('current-question-number').textContent = '-';
        document.getElementById('current-question-card').style.display = 'none';
        
        startGameBtn.disabled = true;
        generateBtn.disabled = false;
        nextQuestionBtn.disabled = true;
        showAnswerBtn.disabled = true;
        endGameBtn.disabled = true;
        
        updateGameStatus('Réinitialisé - En attente de configuration');
        showStatus('Système réinitialisé', 'success');
        
        // Notifier le serveur
        socket.emit('game-reset');
        
        console.log('🔄 Système admin réinitialisé');
        
    } catch (error) {
        errorHandler.handleError(error, 'Réinitialisation');
        showStatus('Erreur lors de la réinitialisation', 'error');
    }
}

// ────────────────   ÉVÉNEMENTS SOCKET.IO
function initializeSocketEvents() {
    socket.on('connect', () => {
        statusDiv.textContent = '🟢 Connecté';
        statusDiv.style.color = '#10b981';
        console.log('✅ Admin connecté au serveur');
    });
    
    socket.on('disconnect', () => {
        statusDiv.textContent = '🔴 Déconnecté';
        statusDiv.style.color = '#ef4444';
        console.log('❌ Admin déconnecté du serveur');
        
        // Nettoyer les timers lors de la déconnexion
        timerManager.clearAllTimers();
    });
    
    socket.on('admin-joined', (data) => {
        console.log('🔧 Admin rejoint avec succès:', data);
        updateGameStatus('Admin connecté - En attente de configuration');
        
        if (data && data.stats) {
            console.log('📊 Statistiques serveur:', data.stats);
        }
    });
    
    socket.on('players-update', (players) => {
        displayAdminPlayers(players);
        updateLeaderboard(players);
    });
    
    socket.on('player-answer', (data) => {
        console.log('📝 Réponse joueur reçue:', data);
        // TODO: Afficher les réponses en temps réel dans l'interface admin
    });
    
    // Gestion d'erreurs socket
    socket.on('error', (error) => {
        errorHandler.handleError(new Error(error), 'Socket Error');
        showStatus('Erreur de connexion', 'error');
    });
}

// ────────────────   AFFICHAGE DES JOUEURS
function displayAdminPlayers(players) {
    const container = document.getElementById('admin-players-container');
    const countElement = document.getElementById('admin-player-count');
    
    if (!container || !countElement) return;
    
    countElement.textContent = players.length;
    
    container.innerHTML = players.map(player => `
        <div class="player-item">
            <span class="player-avatar">${player.avatar}</span>
            <span class="player-name">${player.name}</span>
            <span class="player-lives">❤️ ${player.lives} | 🏆 ${player.score} pts</span>
            ${player.reconnected ? '<span class="reconnected-badge">🔄</span>' : ''}
        </div>
    `).join('');
}

// ────────────────   CLASSEMENT
function updateLeaderboard(players) {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    if (sortedPlayers.length === 0) {
        container.innerHTML = '<p>Aucun joueur connecté</p>';
        return;
    }
    
    container.innerHTML = sortedPlayers.map((player, index) => `
        <div class="leaderboard-item ${index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : ''}">
            <span class="leaderboard-rank">${index + 1}</span>
            <span class="player-avatar">${player.avatar}</span>
            <span class="player-name">${player.name}</span>
            <span class="leaderboard-score">${player.score} pts</span>
            <span class="player-lives">❤️ ${player.lives}</span>
        </div>
    `).join('');
}

// ────────────────   UTILITAIRES
function showStatus(message, type) {
    const statusElement = document.getElementById('generation-status');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}

function updateGameStatus(status) {
    const element = document.getElementById('game-status');
    if (element) {
        element.textContent = status;
    }
}

// ────────────────   NETTOYAGE LORS DE LA FERMETURE
window.addEventListener('beforeunload', () => {
    timerManager.clearAllTimers();
    console.log('🧹 Nettoyage admin lors de la fermeture');
});

// ────────────────   GESTION DES ERREURS DE FOCUS/BLUR
window.addEventListener('blur', () => {
    // Optionnel: mettre en pause les timers si la fenêtre perd le focus
    console.log('👁️ Fenêtre admin a perdu le focus');
});

window.addEventListener('focus', () => {
    console.log('👁️ Fenêtre admin a repris le focus');
});