const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const GameManager = require('./services/GameManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sciencequiz', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connecté à MongoDB'))
.catch(err => console.error('❌ Erreur MongoDB:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Initialize Game Manager
const gameManager = new GameManager(io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 Nouvel utilisateur connecté:', socket.id);

  socket.on('join-lobby', (playerData) => {
    gameManager.addPlayerToLobby(socket, playerData);
  });

  socket.on('join-game', (gameId) => {
    gameManager.joinGame(socket, gameId);
  });

  socket.on('submit-answer', (answerData) => {
    gameManager.handleAnswer(socket, answerData);
  });

  socket.on('admin-action', (action) => {
    gameManager.handleAdminAction(socket, action);
  });

  socket.on('disconnect', () => {
    console.log('👤 Utilisateur déconnecté:', socket.id);
    gameManager.removePlayer(socket);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur interne' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});