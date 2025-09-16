const Game = require('../models/Game');
const Player = require('../models/Player');
const PerplexityService = require('./PerplexityService');
const { v4: uuidv4 } = require('uuid');

class GameManager {
  constructor(io) {
    this.io = io;
    this.perplexityService = new PerplexityService();
    this.activeGames = new Map();
    this.lobbyPlayers = new Map();
    this.questionTimers = new Map();
  }

  async addPlayerToLobby(socket, playerData) {
    try {
      // Créer ou mettre à jour le joueur
      let player = await Player.findOne({ pseudo: playerData.pseudo });
      
      if (!player) {
        player = new Player({
          pseudo: playerData.pseudo,
          avatar: playerData.avatar
        });
        await player.save();
      } else {
        player.avatar = playerData.avatar || player.avatar;
        player.isOnline = true;
        player.socketId = socket.id;
        player.lastActive = new Date();
        await player.save();
      }

      // Ajouter au lobby
      this.lobbyPlayers.set(socket.id, {
        id: player._id,
        pseudo: player.pseudo,
        avatar: player.avatar,
        socket: socket
      });

      socket.join('lobby');
      socket.emit('lobby-joined', { playerId: player._id, pseudo: player.pseudo });
      
      // Notifier tous les joueurs du lobby
      this.io.to('lobby').emit('lobby-updated', this.getLobbyPlayers());
      
      console.log(`🎮 ${player.pseudo} a rejoint le lobby`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout au lobby:', error);
      socket.emit('error', { message: 'Erreur lors de la connexion' });
    }
  }

  async createGame(adminSocket, gameData) {
    try {
      const gameId = uuidv4().substring(0, 8).toUpperCase();
      
      const game = new Game({
        gameId: gameId,
        adminId: adminSocket.id,
        createdBy: gameData.adminName || 'Admin'
      });
      
      await game.save();
      this.activeGames.set(gameId, game);
      
      // Notifier le lobby qu'une nouvelle partie est disponible
      this.io.to('lobby').emit('game-available', {
        gameId: gameId,
        createdBy: game.createdBy
      });
      
      console.log(`🎯 Nouvelle partie créée: ${gameId}`);
      return gameId;
    } catch (error) {
      console.error('Erreur lors de la création de partie:', error);
      throw error;
    }
  }

  async joinGame(socket, gameId) {
    try {
      const game = await Game.findOne({ gameId: gameId });
      if (!game) {
        socket.emit('error', { message: 'Partie non trouvée' });
        return;
      }

      if (game.status !== 'waiting') {
        socket.emit('error', { message: 'La partie a déjà commencé' });
        return;
      }

      const lobbyPlayer = this.lobbyPlayers.get(socket.id);
      if (!lobbyPlayer) {
        socket.emit('error', { message: 'Vous devez être dans le lobby' });
        return;
      }

      // Vérifier si le joueur est déjà dans la partie
      const existingPlayer = game.players.find(p => p.pseudo === lobbyPlayer.pseudo);
      if (existingPlayer) {
        socket.emit('error', { message: 'Vous êtes déjà dans cette partie' });
        return;
      }

      // Ajouter le joueur à la partie
      game.players.push({
        playerId: lobbyPlayer.id,
        pseudo: lobbyPlayer.pseudo,
        avatar: lobbyPlayer.avatar,
        score: 0,
        answers: [],
        isConnected: true
      });

      await game.save();
      
      // Faire rejoindre la room de la partie
      socket.leave('lobby');
      socket.join(gameId);
      
      socket.emit('game-joined', { gameId: gameId });
      this.io.to(gameId).emit('game-updated', this.getGameData(game));
      
      console.log(`🎮 ${lobbyPlayer.pseudo} a rejoint la partie ${gameId}`);
    } catch (error) {
      console.error('Erreur lors de la connexion à la partie:', error);
      socket.emit('error', { message: 'Erreur lors de la connexion à la partie' });
    }
  }

  async startGame(adminSocket, gameId) {
    try {
      const game = await Game.findOne({ gameId: gameId });
      if (!game || game.adminId !== adminSocket.id) {
        adminSocket.emit('error', { message: 'Non autorisé' });
        return;
      }

      if (game.players.length === 0) {
        adminSocket.emit('error', { message: 'Aucun joueur dans la partie' });
        return;
      }

      game.status = 'active';
      await game.save();

      this.io.to(gameId).emit('game-started');
      await this.nextQuestion(gameId);
      
      console.log(`🚀 Partie ${gameId} démarrée avec ${game.players.length} joueurs`);
    } catch (error) {
      console.error('Erreur lors du démarrage de partie:', error);
    }
  }

  async nextQuestion(gameId) {
    try {
      const game = await Game.findOne({ gameId: gameId });
      if (!game || game.status !== 'active') return;

      // Générer une nouvelle question
      const questionData = await this.perplexityService.generateQuestion();
      
      game.questions.push(questionData);
      game.questionStartTime = new Date();
      await game.save();

      const questionIndex = game.questions.length - 1;
      const questionForClients = {
        index: questionIndex,
        question: questionData.question,
        choices: questionData.choices,
        timeLimit: questionData.timeLimit
      };

      this.io.to(gameId).emit('new-question', questionForClients);
      
      // Démarrer le timer de question
      this.startQuestionTimer(gameId, questionData.timeLimit);
      
      console.log(`❓ Nouvelle question pour la partie ${gameId}: ${questionData.question}`);
    } catch (error) {
      console.error('Erreur lors de la génération de question:', error);
    }
  }

  startQuestionTimer(gameId, timeLimit) {
    // Nettoyer le timer précédent s'il existe
    if (this.questionTimers.has(gameId)) {
      clearTimeout(this.questionTimers.get(gameId));
    }

    const timer = setTimeout(async () => {
      await this.endQuestion(gameId);
    }, timeLimit * 1000);

    this.questionTimers.set(gameId, timer);
  }

  async endQuestion(gameId) {
    try {
      const game = await Game.findOne({ gameId: gameId });
      if (!game) return;

      const currentQuestion = game.questions[game.questions.length - 1];
      
      // Calculer les scores et classements
      const results = this.calculateQuestionResults(game, currentQuestion);
      
      this.io.to(gameId).emit('question-ended', {
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        results: results
      });

      // Mettre à jour les scores des joueurs
      await this.updatePlayerScores(game, results);
      
      console.log(`⏰ Question terminée pour la partie ${gameId}`);
    } catch (error) {
      console.error('Erreur lors de la fin de question:', error);
    }
  }

  async handleAnswer(socket, answerData) {
    try {
      const { gameId, questionIndex, answer } = answerData;
      
      const game = await Game.findOne({ gameId: gameId });
      if (!game || game.status !== 'active') return;

      const player = game.players.find(p => p.pseudo === this.getPlayerPseudo(socket));
      if (!player) return;

      const currentTime = new Date();
      const timeToAnswer = (currentTime - game.questionStartTime) / 1000;
      
      if (timeToAnswer > game.questions[questionIndex].timeLimit) {
        return; // Temps écoulé
      }

      // Vérifier si le joueur a déjà répondu
      const existingAnswer = player.answers.find(a => a.questionIndex === questionIndex);
      if (existingAnswer) return;

      const isCorrect = answer === game.questions[questionIndex].correctAnswer;
      
      player.answers.push({
        questionIndex: questionIndex,
        answer: answer,
        timeToAnswer: timeToAnswer,
        isCorrect: isCorrect,
        timestamp: currentTime
      });

      await game.save();
      
      // Check for suspicious activity after answer submission
      this.detectSuspiciousActivity(player, game);
      
      socket.emit('answer-submitted', { isCorrect: isCorrect });
      
    } catch (error) {
      console.error('Erreur lors de la soumission de réponse:', error);
    }
  }

  calculateQuestionResults(game, question) {
    const results = [];
    
    game.players.forEach(player => {
      const lastAnswer = player.answers[player.answers.length - 1];
      let questionScore = 0;
      
      if (lastAnswer && lastAnswer.isCorrect) {
        // Score basé sur la rapidité (1000 points max - temps de réponse)
        const timeBonus = Math.max(0, 1000 - (lastAnswer.timeToAnswer * 50));
        questionScore = Math.round(1000 + timeBonus);
      }
      
      player.score += questionScore;
      
      results.push({
        pseudo: player.pseudo,
        avatar: player.avatar,
        questionScore: questionScore,
        totalScore: player.score,
        answered: !!lastAnswer,
        correct: lastAnswer ? lastAnswer.isCorrect : false,
        timeToAnswer: lastAnswer ? lastAnswer.timeToAnswer : null
      });
    });
    
    // Trier par score total
    results.sort((a, b) => b.totalScore - a.totalScore);
    
    return results;
  }

  async updatePlayerScores(game, results) {
    for (const result of results) {
      try {
        await Player.findOneAndUpdate(
          { pseudo: result.pseudo },
          { 
            $inc: { totalScore: result.questionScore },
            lastActive: new Date()
          }
        );
      } catch (error) {
        console.error('Erreur mise à jour score joueur:', error);
      }
    }
  }

  getPlayerPseudo(socket) {
    const lobbyPlayer = this.lobbyPlayers.get(socket.id);
    return lobbyPlayer ? lobbyPlayer.pseudo : null;
  }

  getLobbyPlayers() {
    return Array.from(this.lobbyPlayers.values()).map(player => ({
      pseudo: player.pseudo,
      avatar: player.avatar
    }));
  }

  getGameData(game) {
    return {
      gameId: game.gameId,
      status: game.status,
      players: game.players.map(p => ({
        pseudo: p.pseudo,
        avatar: p.avatar,
        score: p.score,
        isConnected: p.isConnected
      })),
      currentQuestion: game.currentQuestion,
      createdBy: game.createdBy
    };
  }

  async handleAdminAction(socket, action) {
    try {
      const { type, gameId, data } = action;
      
      switch (type) {
        case 'create-game':
          const newGameId = await this.createGame(socket, data);
          socket.emit('game-created', { gameId: newGameId });
          break;
          
        case 'start-game':
          await this.startGame(socket, gameId);
          break;
          
        case 'next-question':
          await this.nextQuestion(gameId);
          break;
          
        case 'end-game':
          await this.endGame(socket, gameId);
          break;
          
        case 'kick-player':
          await this.kickPlayer(socket, gameId, data.pseudo);
          break;
          
        case 'ban-player':
          await this.banPlayerFromGame(socket, gameId, data.pseudo, data.reason);
          break;
          
        case 'modify-game-settings':
          await this.modifyGameSettings(socket, gameId, data.settings);
          break;
          
        case 'broadcast-message':
          await this.broadcastAdminMessage(socket, gameId, data.message);
          break;
          
        case 'get-game-stats':
          await this.sendGameStatistics(socket, gameId);
          break;
          
        default:
          socket.emit('error', { message: 'Action non reconnue' });
      }
    } catch (error) {
      console.error('Erreur action admin:', error);
      socket.emit('error', { message: 'Erreur lors de l\'action admin' });
    }
  }

  async endGame(adminSocket, gameId) {
    try {
      const game = await Game.findOne({ gameId: gameId });
      if (!game || game.adminId !== adminSocket.id) {
        adminSocket.emit('error', { message: 'Non autorisé' });
        return;
      }

      game.status = 'finished';
      await game.save();

      // Nettoyer le timer
      if (this.questionTimers.has(gameId)) {
        clearTimeout(this.questionTimers.get(gameId));
        this.questionTimers.delete(gameId);
      }

      const finalResults = game.players
        .map(p => ({
          pseudo: p.pseudo,
          avatar: p.avatar,
          totalScore: p.score,
          correctAnswers: p.answers.filter(a => a.isCorrect).length,
          totalAnswers: p.answers.length
        }))
        .sort((a, b) => b.totalScore - a.totalScore);

      this.io.to(gameId).emit('game-ended', { results: finalResults });
      
      // Mettre à jour les statistiques des joueurs
      for (const player of game.players) {
        await Player.findByIdAndUpdate(player.playerId, {
          $inc: { gamesPlayed: 1 }
        });
      }

      this.activeGames.delete(gameId);
      console.log(`🏁 Partie ${gameId} terminée`);
    } catch (error) {
      console.error('Erreur lors de la fin de partie:', error);
    }
  }

  removePlayer(socket) {
    // Retirer du lobby
    if (this.lobbyPlayers.has(socket.id)) {
      const player = this.lobbyPlayers.get(socket.id);
      this.lobbyPlayers.delete(socket.id);
      
      // Mettre à jour le statut offline du joueur
      Player.findOneAndUpdate(
        { pseudo: player.pseudo },
        { isOnline: false, socketId: null }
      ).catch(console.error);
      
      this.io.to('lobby').emit('lobby-updated', this.getLobbyPlayers());
    }
  }

  // New admin-specific methods
  async kickPlayer(adminSocket, gameId, pseudo) {
    try {
      const game = await Game.findOne({ gameId: gameId });
      if (!game || game.adminId !== adminSocket.id) {
        adminSocket.emit('error', { message: 'Non autorisé' });
        return;
      }

      // Find player in game
      const playerIndex = game.players.findIndex(p => p.pseudo === pseudo);
      if (playerIndex === -1) {
        adminSocket.emit('error', { message: 'Joueur non trouvé dans la partie' });
        return;
      }

      // Remove player from game
      const kickedPlayer = game.players[playerIndex];
      game.players.splice(playerIndex, 1);
      await game.save();

      // Notify the kicked player
      const playerSockets = Array.from(this.io.sockets.sockets.values())
        .filter(s => this.getPlayerPseudo(s) === pseudo);
      
      playerSockets.forEach(playerSocket => {
        playerSocket.emit('kicked-from-game', { 
          gameId, 
          reason: 'Exclu par l\'administrateur' 
        });
        playerSocket.leave(gameId);
      });

      // Notify other players
      this.io.to(gameId).emit('player-kicked', { 
        pseudo, 
        message: `${pseudo} a été exclu de la partie` 
      });

      console.log(`👮 Joueur ${pseudo} exclu de la partie ${gameId} par admin`);
    } catch (error) {
      console.error('Erreur lors de l\'exclusion du joueur:', error);
      adminSocket.emit('error', { message: 'Erreur lors de l\'exclusion du joueur' });
    }
  }

  async banPlayerFromGame(adminSocket, gameId, pseudo, reason = 'Comportement inapproprié') {
    try {
      const game = await Game.findOne({ gameId: gameId });
      if (!game || game.adminId !== adminSocket.id) {
        adminSocket.emit('error', { message: 'Non autorisé' });
        return;
      }

      // Find and update player
      const player = await Player.findOne({ pseudo });
      if (player) {
        player.warnings += 1;
        if (player.warnings >= 3) {
          player.isBanned = true;
          player.banExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h ban
        }
        await player.save();
      }

      // Kick from current game
      await this.kickPlayer(adminSocket, gameId, pseudo);

      console.log(`🚫 Joueur ${pseudo} averti/banni par admin: ${reason}`);
    } catch (error) {
      console.error('Erreur lors du bannissement du joueur:', error);
      adminSocket.emit('error', { message: 'Erreur lors du bannissement du joueur' });
    }
  }

  async modifyGameSettings(adminSocket, gameId, settings) {
    try {
      const game = await Game.findOne({ gameId: gameId });
      if (!game || game.adminId !== adminSocket.id) {
        adminSocket.emit('error', { message: 'Non autorisé' });
        return;
      }

      if (game.status !== 'waiting') {
        adminSocket.emit('error', { message: 'Impossible de modifier une partie en cours' });
        return;
      }

      // Update settings
      Object.assign(game.settings, settings);
      await game.save();

      // Notify players of changes
      this.io.to(gameId).emit('game-settings-updated', {
        settings: game.settings,
        message: 'Les paramètres de la partie ont été modifiés'
      });

      console.log(`⚙️ Paramètres de la partie ${gameId} modifiés par admin`);
    } catch (error) {
      console.error('Erreur lors de la modification des paramètres:', error);
      adminSocket.emit('error', { message: 'Erreur lors de la modification des paramètres' });
    }
  }

  async broadcastAdminMessage(adminSocket, gameId, message) {
    try {
      const game = await Game.findOne({ gameId: gameId });
      if (!game || game.adminId !== adminSocket.id) {
        adminSocket.emit('error', { message: 'Non autorisé' });
        return;
      }

      this.io.to(gameId).emit('admin-message', {
        message,
        timestamp: new Date(),
        from: 'Administrateur'
      });

      console.log(`📢 Message admin diffusé dans la partie ${gameId}: ${message}`);
    } catch (error) {
      console.error('Erreur lors de la diffusion du message:', error);
      adminSocket.emit('error', { message: 'Erreur lors de la diffusion du message' });
    }
  }

  async sendGameStatistics(adminSocket, gameId) {
    try {
      const game = await Game.findOne({ gameId: gameId });
      if (!game || game.adminId !== adminSocket.id) {
        adminSocket.emit('error', { message: 'Non autorisé' });
        return;
      }

      const stats = {
        gameId: game.gameId,
        status: game.status,
        playerCount: game.players.length,
        questionsPlayed: game.currentQuestion,
        totalQuestions: game.questions.length,
        averageScore: game.players.length > 0 
          ? game.players.reduce((sum, p) => sum + p.score, 0) / game.players.length 
          : 0,
        topScore: game.players.length > 0 
          ? Math.max(...game.players.map(p => p.score)) 
          : 0,
        duration: game.createdAt ? Date.now() - game.createdAt.getTime() : 0,
        playerStats: game.players.map(p => ({
          pseudo: p.pseudo,
          score: p.score,
          correctAnswers: p.answers.filter(a => a.isCorrect).length,
          totalAnswers: p.answers.length,
          isConnected: p.isConnected
        }))
      };

      adminSocket.emit('game-statistics', stats);
    } catch (error) {
      console.error('Erreur lors de l\'envoi des statistiques:', error);
      adminSocket.emit('error', { message: 'Erreur lors de l\'envoi des statistiques' });
    }
  }

  // Method to check for suspicious activity
  detectSuspiciousActivity(player, game) {
    const alerts = [];

    // Check for unusually fast answers
    const recentAnswers = player.answers.slice(-5);
    const averageTime = recentAnswers.reduce((sum, a) => sum + a.timeToAnswer, 0) / recentAnswers.length;
    
    if (averageTime < 2 && recentAnswers.length >= 3) {
      alerts.push({
        type: 'fast_answers',
        severity: 'medium',
        message: `Joueur ${player.pseudo} répond très rapidement (${averageTime.toFixed(2)}s en moyenne)`
      });
    }

    // Check for perfect score with fast answers
    const correctRate = player.answers.filter(a => a.isCorrect).length / player.answers.length;
    if (correctRate > 0.9 && averageTime < 3 && player.answers.length >= 5) {
      alerts.push({
        type: 'perfect_fast_answers',
        severity: 'high',
        message: `Joueur ${player.pseudo} a un taux de réussite élevé (${(correctRate * 100).toFixed(1)}%) avec des réponses rapides`
      });
    }

    // Send alerts to admins if any
    if (alerts.length > 0) {
      this.io.emit('admin-security-alert', {
        gameId: game.gameId,
        player: player.pseudo,
        alerts
      });
    }

    return alerts;
  }
}

module.exports = GameManager;