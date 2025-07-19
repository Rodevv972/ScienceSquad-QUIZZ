// Connexion Socket.IO
const socket = io();

// État du jeu
let gameState = {
    questionConfig: null,         // infos sujet / nombre / difficulté / timer
    currentQuestionIndex: 0,
    gameActive: false,
    showingAnswer: false,
    currentQuestion: null
};
let currentTimer = null;          // timer visuel question

// Références DOM
const statusDiv       = document.getElementById('status');
const generateBtn     = document.getElementById('generate-questions-btn');
const startGameBtn    = document.getElementById('start-game-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const showAnswerBtn   = document.getElementById('show-answer-btn');
const endGameBtn      = document.getElementById('end-game-btn');
const resetAllBtn     = document.getElementById('reset-all-btn');

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initializeButtons();
    initializeSocketEvents();
    socket.emit('join-admin');
});

// Boutons
function initializeButtons() {
    generateBtn.onclick      = configureQuiz;
    startGameBtn.onclick     = startGame;
    nextQuestionBtn.onclick  = nextQuestion;
    showAnswerBtn.onclick    = showAnswer;
    endGameBtn.onclick       = endGame;
    resetAllBtn.onclick      = resetAll;
    document.getElementById('question-topic')
        .addEventListener('change', handleTopicChange);
}

// Gestion du domaine personnalisé
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

// Configuration du quiz
function configureQuiz() {
    const topicSelect = document.getElementById('question-topic');
    const customTopic = document.getElementById('custom-topic');
    const count       = +document.getElementById('question-count').value;
    const difficulty  = document.getElementById('question-difficulty').value;
    const timeLimit   = parseInt(document.getElementById('timer-seconds').value, 10);

    let topic = topicSelect.value === 'personnalise'
        ? customTopic.value.trim()
        : topicSelect.value;

    if (!topic) {
        return showStatus('Sélectionnez un sujet', 'error');
    }
    if (count < 1 || count > 30) {
        return showStatus('Nombre de questions entre 1 et 30', 'error');
    }
    if (isNaN(timeLimit) || timeLimit < 5 || timeLimit > 120) {
        return showStatus('Temps par question entre 5 et 120 secondes', 'error');
    }

    gameState.questionConfig = { topic, count, difficulty, timeLimit };
    document.getElementById('questions-count').textContent = count;
    startGameBtn.disabled = false;
    showStatus('Configuration enregistrée ✔️', 'success');
    updateGameStatus(`Configuration prête - Prêt à démarrer (${timeLimit}s/question)`);
}

// Démarrer la partie
function startGame() {
    if (!gameState.questionConfig)
        return showStatus("Configurez d'abord le quiz", 'error');

    gameState.gameActive = true;
    gameState.currentQuestionIndex = 0;

    startGameBtn.disabled    = true;
    generateBtn.disabled     = true;
    nextQuestionBtn.disabled = false;
    endGameBtn.disabled      = false;

    updateGameStatus('Partie en cours');

    socket.emit('game-started', {
        topic: gameState.questionConfig.topic,
        difficulty: gameState.questionConfig.difficulty,
        totalQuestions: gameState.questionConfig.count,
        timeLimit: gameState.questionConfig.timeLimit
    });
    showCurrentQuestion();
}

// Génération à la volée
async function generateOneQuestion() {
    const cfg = gameState.questionConfig;
    const n   = gameState.currentQuestionIndex + 1;
    const diff = cfg.difficulty === 'progressif'
        ? (n <= cfg.count / 3 ? 'facile' :
           n <= cfg.count * 2 / 3 ? 'moyen' : 'difficile')
        : cfg.difficulty;

    const res = await fetch('/api/generate-single-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            topic: cfg.topic,
            difficulty: diff,
            questionNumber: n,
            totalQuestions: cfg.count
        })
    });

    if (!res.ok) throw new Error('Impossible de générer la question');
    return res.json();
}

// Afficher la question
async function showCurrentQuestion() {
    const card = document.getElementById('current-question-card');
    card.style.display = 'block';
    document.getElementById('question-text').textContent = '⏳ Génération...';
    document.getElementById('question-options').innerHTML = '';

    try {
        // Correction : on récupère la vraie question dans .data
        const response = await generateOneQuestion();
        const q = response.data;
        console.log('DEBUG question générée', q);

        // PATCH: Sécurisation du format de la question
        if (!q || !Array.isArray(q.options)) {
            showStatus('Erreur: la question générée est invalide.', 'error');
            document.getElementById('question-text').textContent = '❌ Question non valide';
            return;
        }

        document.getElementById('question-counter').textContent =
            `Question ${gameState.currentQuestionIndex + 1}/${gameState.questionConfig.count}`;
        document.getElementById('current-question-number').textContent =
            `${gameState.currentQuestionIndex + 1}/${gameState.questionConfig.count}`;
        document.getElementById('question-text').textContent = q.question;

        const opts = document.getElementById('question-options');
        opts.innerHTML = q.options.map((opt, i) => `
            <div class="question-option" data-index="${i}">
                ${String.fromCharCode(65 + i)}. ${opt}
            </div>
        `).join('');

        document.getElementById('question-answer').style.display = 'none';
        showAnswerBtn.disabled   = false;
        nextQuestionBtn.disabled = true;
        gameState.showingAnswer  = false;
        gameState.currentQuestion = q;

        socket.emit('question-displayed', {
            questionIndex: gameState.currentQuestionIndex,
            question: q.question,
            options: q.options,
            timeLimit: gameState.questionConfig.timeLimit
        });

        startQuestionTimer(gameState.questionConfig.timeLimit);

    } catch (err) {
        console.error(err);
        showStatus('Erreur de génération', 'error');
        document.getElementById('question-text').textContent = '❌ Erreur de génération';
    }
}

// Timer animé
function startQuestionTimer(timeLimit) {
    if (currentTimer) {
        clearInterval(currentTimer);
    }

    let timeLeft = timeLimit;
    const timerSeconds  = document.getElementById('timer-seconds');
    const timerProgress = document.querySelector('.timer-progress');
    const timerContainer = document.querySelector('.timer-container');

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

    currentTimer = setInterval(() => {
        if (timerSeconds) {
            timerSeconds.textContent = timeLeft;
        }

        const percentage = (timeLeft / timeLimit) * 100;
        if (timerProgress) {
            timerProgress.style.strokeDashoffset = 100 - percentage;
        }

        if (timeLeft <= 3) {
            if (timerProgress) {
                timerProgress.classList.add('danger');
                timerProgress.classList.remove('warning');
            }
            if (timerSeconds) {
                timerSeconds.classList.add('danger');
                timerSeconds.classList.remove('warning');
            }
        } else if (timeLeft <= 5) {
            if (timerProgress) {
                timerProgress.classList.add('warning');
                timerProgress.classList.remove('danger');
            }
            if (timerSeconds) {
                timerSeconds.classList.add('warning');
                timerSeconds.classList.remove('danger');
            }
        }

        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(currentTimer);
            currentTimer = null;

            if (timerSeconds) {
                timerSeconds.textContent = '0';
            }
            if (timerProgress) {
                timerProgress.style.strokeDashoffset = '100';
            }
            if (timerContainer) {
                timerContainer.classList.add('timer-expired');
            }
        }
    }, 1000);
}

// Afficher la réponse
function showAnswer() {
    if (currentTimer) {
        clearInterval(currentTimer);
        currentTimer = null;
    }

    const q = gameState.currentQuestion;
    const corr = q.correct;

    document.querySelectorAll('.question-option')
        .forEach((el, i) => {
            el.classList.add(i === corr ? 'correct' : 'incorrect');
        });

    document.getElementById('question-answer').innerHTML =
        `<strong>Réponse :</strong> ${q.options[corr]}<br>
         <strong>Explication :</strong> ${q.explanation}`;
    document.getElementById('question-answer').style.display = 'block';

    showAnswerBtn.disabled   = true;
    nextQuestionBtn.disabled = false;
    gameState.showingAnswer  = true;

    socket.emit('answer-revealed', {
        correctAnswer: corr,
        explanation: q.explanation
    });
}

// Question suivante
function nextQuestion() {
    gameState.currentQuestionIndex++;
    if (gameState.currentQuestionIndex >= gameState.questionConfig.count)
        return endGame();
    showCurrentQuestion();
}

// Terminer la partie
function endGame() {
    if (currentTimer) {
        clearInterval(currentTimer);
        currentTimer = null;
    }

    gameState.gameActive = false;

    document.getElementById('current-question-card').style.display = 'none';

    startGameBtn.disabled    = false;
    generateBtn.disabled     = false;
    nextQuestionBtn.disabled = true;
    showAnswerBtn.disabled   = true;
    endGameBtn.disabled      = true;

    updateGameStatus('Partie terminée');

    socket.emit('game-ended', {
        totalQuestions: gameState.questionConfig.count
    });
}

// Réinitialiser
function resetAll() {
    if (confirm('Êtes-vous sûr de vouloir tout réinitialiser?')) {
        if (currentTimer) {
            clearInterval(currentTimer);
            currentTimer = null;
        }

        document.getElementById('question-topic').value = '';
        document.getElementById('custom-topic').value = '';
        document.getElementById('custom-topic-group').style.display = 'none';
        document.getElementById('timer-seconds').value = '10';

        gameState = {
            questionConfig: null,
            currentQuestionIndex: 0,
            gameActive: false,
            showingAnswer: false,
            currentQuestion: null
        };

        document.getElementById('questions-count').textContent = '0';
        document.getElementById('current-question-number').textContent = '-';
        document.getElementById('current-question-card').style.display = 'none';

        startGameBtn.disabled    = true;
        generateBtn.disabled     = false;
        nextQuestionBtn.disabled = true;
        showAnswerBtn.disabled   = true;
        endGameBtn.disabled      = true;

        updateGameStatus('Réinitialisé - En attente de configuration');
        showStatus('Système réinitialisé', 'success');

        socket.emit('game-reset');
    }
}

// Événements Socket.IO
function initializeSocketEvents() {
    socket.on('connect', () => {
        statusDiv.textContent = '🟢 Connecté';
        statusDiv.style.color = '#10b981';
    });

    socket.on('disconnect', () => {
        statusDiv.textContent = '🔴 Déconnecté';
        statusDiv.style.color = '#ef4444';
    });

    socket.on('admin-joined', () => {
        updateGameStatus('Admin connecté - En attente de configuration');
    });

    socket.on('players-update', (players) => {
        displayAdminPlayers(players);
        updateLeaderboard(players);
    });

    socket.on('player-answer', (data) => {
        // À compléter si tu veux afficher les réponses en temps réel
    });
}

// Affichage des joueurs
function displayAdminPlayers(players) {
    const container     = document.getElementById('admin-players-container');
    const countElement  = document.getElementById('admin-player-count');

    countElement.textContent = players.length;

    container.innerHTML = players.map(player => `
        <div class="player-item">
            <span class="player-avatar">${player.avatar}</span>
            <span class="player-name">${player.name}</span>
            <span class="player-lives">❤️ ${player.lives} | 🏆 ${player.score} pts</span>
        </div>
    `).join('');
}

// Classement
function updateLeaderboard(players) {
    const container = document.getElementById('leaderboard-container');
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

// Utilitaires
function showStatus(message, type) {
    const statusElement = document.getElementById('generation-status');
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
    document.getElementById('game-status').textContent = status;
}