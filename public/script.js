// Connexion Socket.IO
const socket = io();

// Variables globales
let currentPlayer = null;
let selectedAvatar = '😊';
let gameActive = false;
let currentQuestion = null;
let selectedOptionIndex = null;
let gameTimer = null;
let playerScore = 0;
let totalQuestions = 0;
let currentQuestionIndex = 0;

// Éléments DOM
const welcomeScreen = document.getElementById('welcome-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const statusDiv = document.getElementById('status');
const joinGameBtn = document.getElementById('join-game-btn');
const playerNameInput = document.getElementById('player-name');

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initializeAvatarSelection();
    initializeButtons();
    initializeSocketEvents();
    
    // Vérifier si le joueur était déjà connecté
    checkForStoredPlayer();
});

// Vérifier la persistence du joueur
function checkForStoredPlayer() {
    const storedPlayer = localStorage.getItem('scienceSquadPlayer');
    
    if (storedPlayer) {
        try {
            const playerData = JSON.parse(storedPlayer);
            
            // Pré-remplir les champs
            playerNameInput.value = playerData.name;
            selectedAvatar = playerData.avatar;
            
            // Sélectionner l'avatar correspondant
            const avatars = document.querySelectorAll('.avatar');
            avatars.forEach(avatar => {
                avatar.classList.remove('selected');
                if (avatar.dataset.avatar === playerData.avatar) {
                    avatar.classList.add('selected');
                }
            });
            
            // Tenter une reconnexion automatique
            console.log('🔄 Tentative de reconnexion automatique...');
            setTimeout(() => {
                socket.emit('rejoin-player', playerData);
            }, 500);
            
        } catch (error) {
            console.error('Erreur lors de la lecture des données stockées:', error);
            localStorage.removeItem('scienceSquadPlayer');
        }
    }
}

// Gestion des avatars
function initializeAvatarSelection() {
    const avatars = document.querySelectorAll('.avatar');
    
    if (avatars.length > 0) {
        avatars[0].classList.add('selected');
    }
    
    avatars.forEach(avatar => {
        avatar.addEventListener('click', () => {
            avatars.forEach(a => a.classList.remove('selected'));
            avatar.classList.add('selected');
            selectedAvatar = avatar.dataset.avatar;
        });
    });
}

// Gestion des boutons
function initializeButtons() {
    joinGameBtn.addEventListener('click', joinAsPlayer);
    
    // Bouton retour au lobby
    const returnLobbyBtn = document.getElementById('return-lobby-btn');
    if (returnLobbyBtn) {
        returnLobbyBtn.addEventListener('click', () => {
            showWelcomeScreen();
        });
    }
}

// Rejoindre comme joueur
function joinAsPlayer() {
    const name = playerNameInput.value.trim();
    
    if (!name) {
        alert('Veuillez entrer votre pseudo');
        return;
    }
    
    if (gameActive) {
        alert('Une partie est déjà en cours. Veuillez attendre qu\'elle se termine.');
        return;
    }
    
    socket.emit('join-player', { name, avatar: selectedAvatar });
}

// Sauvegarder les données du joueur
function savePlayerData(playerData) {
    localStorage.setItem('scienceSquadPlayer', JSON.stringify({
        name: playerData.name,
        avatar: playerData.avatar
    }));
}

// Supprimer les données du joueur
function clearPlayerData() {
    localStorage.removeItem('scienceSquadPlayer');
}

// Mettre à jour l'interface selon l'état du jeu
function updateGameStateUI() {
    if (gameActive) {
        joinGameBtn.disabled = true;
        joinGameBtn.textContent = 'Partie en cours...';
        joinGameBtn.style.opacity = '0.5';
        joinGameBtn.style.cursor = 'not-allowed';
    } else {
        joinGameBtn.disabled = false;
        joinGameBtn.textContent = 'Rejoindre le Quiz';
        joinGameBtn.style.opacity = '1';
        joinGameBtn.style.cursor = 'pointer';
    }
}

// Afficher l'écran de jeu
function showGameScreen() {
    welcomeScreen.classList.add('hidden');
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    endScreen.classList.add('hidden');
    
    // Mettre à jour les infos du joueur dans l'interface de jeu
    if (currentPlayer) {
        document.getElementById('player-avatar-game').textContent = currentPlayer.avatar;
        document.getElementById('player-name-game').textContent = currentPlayer.name;
        document.getElementById('player-lives-game').textContent = `❤️ ${currentPlayer.lives}`;
    }
}

// Afficher une question
function displayQuestion(questionData) {
    currentQuestion = questionData;
    selectedOptionIndex = null;
    
    // Mettre à jour le compteur
    document.getElementById('game-question-counter').textContent = 
        `Question ${questionData.questionIndex + 1}/${totalQuestions}`;
    
    // Afficher la question
    document.getElementById('game-question-text').textContent = questionData.question;
    
    // Créer les options
    const optionsContainer = document.getElementById('game-options');
    optionsContainer.innerHTML = questionData.options.map((option, index) => `
        <div class="game-option" data-index="${index}" onclick="selectOption(${index})">
            ${String.fromCharCode(65 + index)}. ${option}
        </div>
    `).join('');
    
    // Masquer les résultats
    document.getElementById('game-result').classList.add('hidden');
    
    // Démarrer le timer
    startGameTimer(questionData.timeLimit || 10);
}

// Sélectionner une option
function selectOption(index) {
    if (selectedOptionIndex !== null) return; // Déjà sélectionné
    
    selectedOptionIndex = index;
    
    // Mettre à jour l'interface
    const options = document.querySelectorAll('.game-option');
    options.forEach((option, i) => {
        option.classList.remove('selected');
        if (i === index) {
            option.classList.add('selected');
        }
    });
    
    // Envoyer la réponse au serveur
    socket.emit('player-answer', {
        questionIndex: currentQuestion.questionIndex,
        answer: index,
        playerId: currentPlayer.id
    });
    
    console.log(`✅ Réponse sélectionnée: ${String.fromCharCode(65 + index)}`);
}

// Timer de jeu
function startGameTimer(timeLimit) {
    let timeLeft = timeLimit;
    const timerSeconds = document.getElementById('game-timer-seconds');
    const timerProgress = document.querySelector('#game-screen .timer-progress');
    const timerContainer = document.querySelector('#game-screen .timer-container');
    
    // Réinitialiser le timer
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
    
    clearInterval(gameTimer);
    gameTimer = setInterval(() => {
        if (timerSeconds) {
            timerSeconds.textContent = timeLeft;
        }
        
        // Calculer le pourcentage pour l'animation
        const percentage = (timeLeft / timeLimit) * 100;
        if (timerProgress) {
            timerProgress.style.strokeDashoffset = 100 - percentage;
        }
        
        // Changer les couleurs selon le temps restant
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
            clearInterval(gameTimer);
            
            if (timerSeconds) {
                timerSeconds.textContent = '0';
            }
            if (timerProgress) {
                timerProgress.style.strokeDashoffset = '100';
            }
            if (timerContainer) {
                timerContainer.classList.add('timer-expired');
            }
            
            // Temps écoulé - désactiver les options
            const options = document.querySelectorAll('.game-option');
            options.forEach(option => {
                option.classList.add('disabled');
                option.style.pointerEvents = 'none';
            });
        }
    }, 1000);
}

// Afficher la réponse
function showAnswer(answerData) {
    clearInterval(gameTimer);
    
    const options = document.querySelectorAll('.game-option');
    const resultDiv = document.getElementById('game-result');
    const resultText = document.getElementById('result-text');
    const resultExplanation = document.getElementById('result-explanation');
    
    // Désactiver toutes les options
    options.forEach(option => {
        option.classList.add('disabled');
        option.style.pointerEvents = 'none';
    });
    
    // Marquer la bonne réponse
    options.forEach((option, index) => {
        if (index === answerData.correctAnswer) {
            option.classList.add('correct');
        } else {
            option.classList.add('incorrect');
        }
    });
    
    // Afficher le résultat
    const isCorrect = selectedOptionIndex === answerData.correctAnswer;
    
    if (isCorrect) {
        resultText.textContent = '✅ Bonne réponse !';
        resultText.className = 'correct';
        playerScore++;
    } else if (selectedOptionIndex !== null) {
        resultText.textContent = '❌ Mauvaise réponse';
        resultText.className = 'incorrect';
    } else {
        resultText.textContent = '⏰ Temps écoulé';
        resultText.className = 'incorrect';
    }
    
    resultExplanation.innerHTML = `
        <strong>Explication :</strong> ${answerData.explanation}
    `;
    
    resultDiv.classList.remove('hidden');
    
    console.log(`📊 Résultat: ${isCorrect ? 'Correct' : 'Incorrect'} | Score: ${playerScore}/${currentQuestionIndex + 1}`);
}

// Afficher l'écran de fin
function showEndScreen() {
    welcomeScreen.classList.add('hidden');
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    endScreen.classList.remove('hidden');
    
    // Afficher le score final
    document.getElementById('final-score-value').textContent = `${playerScore}/${totalQuestions}`;
    
    // Message personnalisé selon le score
    const percentage = (playerScore / totalQuestions) * 100;
    let message = '';
    
    if (percentage >= 80) {
        message = '🎉 Excellent ! Vous maîtrisez parfaitement le sujet !';
    } else if (percentage >= 60) {
        message = '👍 Très bien ! Vous avez de bonnes connaissances !';
    } else if (percentage >= 40) {
        message = '👌 Pas mal ! Continuez à apprendre !';
    } else {
        message = '📚 Il y a encore du travail, mais ne vous découragez pas !';
    }
    
    document.getElementById('score-message-text').textContent = message;
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
    
    // État du jeu
    socket.on('game-state', (data) => {
        gameActive = data.gameActive;
        updateGameStateUI();
    });
    
    // Joueur rejoint avec succès
    socket.on('player-joined', (player) => {
        currentPlayer = player;
        savePlayerData(player);
        showLobbyScreen();
        displayCurrentPlayerInfo();
        console.log('✅ Joueur rejoint avec succès');
    });
    
    // Joueur rejoint avec succès (reconnexion)
    socket.on('player-rejoined', (player) => {
        currentPlayer = player;
        savePlayerData(player);
        showLobbyScreen();
        displayCurrentPlayerInfo();
        console.log('✅ Reconnexion réussie');
    });
    
    // Inscription refusée
    socket.on('join-rejected', (data) => {
        alert(data.message);
        console.log('❌ Inscription refusée:', data.reason);
    });
    
    // Mise à jour des joueurs
    socket.on('players-update', (players) => {
        displayLobbyPlayers(players);
    });
    
    // Événements de partie
    socket.on('game-started', (data) => {
        gameActive = true;
        updateGameStateUI();
        totalQuestions = data.totalQuestions;
        playerScore = 0;
        currentQuestionIndex = 0;
        
        console.log('🎮 Partie démarrée');
        
        // Passer à l'écran de jeu
        showGameScreen();
    });
    
    // Nouvelle question
    socket.on('question-displayed', (data) => {
        currentQuestionIndex = data.questionIndex;
        displayQuestion(data);
        console.log('❓ Nouvelle question affichée');
    });
    
    // Réponse révélée
    socket.on('answer-revealed', (data) => {
        showAnswer(data);
        console.log('💡 Réponse révélée');
    });
    
    socket.on('game-ended', (data) => {
        gameActive = false;
        updateGameStateUI();
        clearInterval(gameTimer);
        
        console.log('🏁 Partie terminée');
        
        // Afficher l'écran de fin
        setTimeout(() => {
            showEndScreen();
        }, 2000);
        
        // Nettoyer les données après un délai
        setTimeout(() => {
            clearPlayerData();
            currentPlayer = null;
            playerScore = 0;
            totalQuestions = 0;
        }, 10000);
    });
    
    socket.on('game-reset', () => {
        gameActive = false;
        updateGameStateUI();
        clearInterval(gameTimer);
        
        console.log('🔄 Jeu réinitialisé');
        
        // Supprimer les données du joueur lors de la réinitialisation
        clearPlayerData();
        currentPlayer = null;
        playerScore = 0;
        totalQuestions = 0;
        
        // Rediriger vers l'écran d'accueil
        showWelcomeScreen();
    });
}

// Afficher l'écran d'accueil
function showWelcomeScreen() {
    welcomeScreen.classList.remove('hidden');
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
}

// Afficher l'écran lobby
function showLobbyScreen() {
    welcomeScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
}

// Afficher les infos du joueur actuel
function displayCurrentPlayerInfo() {
    const container = document.getElementById('current-player-info');
    if (container && currentPlayer) {
        container.innerHTML = `
            <div class="player-item current">
                <span class="player-avatar">${currentPlayer.avatar}</span>
                <span class="player-name">${currentPlayer.name}</span>
                <span class="player-lives">❤️ ${currentPlayer.lives} vies</span>
            </div>
        `;
    }
}

// Afficher les joueurs dans le lobby
function displayLobbyPlayers(players) {
    const container = document.getElementById('players-container');
    const countElement = document.getElementById('player-count');
    
    if (countElement) {
        countElement.textContent = players.length;
    }
    
    if (container) {
        container.innerHTML = players.map(player => `
            <div class="player-item ${player.id === currentPlayer?.id ? 'current' : ''}">
                <span class="player-avatar">${player.avatar}</span>
                <span class="player-name">${player.name}</span>
                ${player.id === currentPlayer?.id ? '<span style="color: #4f46e5;">(Vous)</span>' : ''}
                <span class="player-lives">❤️ ${player.lives} vies</span>
            </div>
        `).join('');
    }
}

// Gestion des événements de fermeture de page
window.addEventListener('beforeunload', () => {
    clearInterval(gameTimer);
});
