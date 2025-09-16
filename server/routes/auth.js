const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const Player = require('../models/Player');
const Admin = require('../models/Admin');

const router = express.Router();

// Configuration multer pour l'upload d'avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Connexion joueur
router.post('/player/login', async (req, res) => {
  try {
    const { pseudo, avatar } = req.body;

    if (!pseudo || pseudo.trim().length < 2 || pseudo.trim().length > 20) {
      return res.status(400).json({ 
        message: 'Le pseudo doit contenir entre 2 et 20 caractères' 
      });
    }

    let player = await Player.findOne({ pseudo: pseudo.trim() });
    
    if (!player) {
      player = new Player({
        pseudo: pseudo.trim(),
        avatar: avatar || null
      });
      await player.save();
    } else {
      if (avatar) {
        player.avatar = avatar;
      }
      player.lastActive = new Date();
      await player.save();
    }

    // Générer un token simple pour la session
    const token = jwt.sign(
      { 
        playerId: player._id, 
        pseudo: player.pseudo,
        type: 'player'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      player: {
        id: player._id,
        pseudo: player.pseudo,
        avatar: player.avatar,
        totalScore: player.totalScore,
        gamesPlayed: player.gamesPlayed
      },
      token
    });

  } catch (error) {
    console.error('Erreur connexion joueur:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
});

// Upload d'avatar
router.post('/player/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      avatarUrl: avatarUrl
    });

  } catch (error) {
    console.error('Erreur upload avatar:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload' });
  }
});

// Connexion admin
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Nom d\'utilisateur et mot de passe requis' 
      });
    }

    let admin = await Admin.findOne({ username: username.trim() });
    
    // Créer l'admin par défaut s'il n'existe pas
    if (!admin && username === process.env.DEFAULT_ADMIN_USERNAME) {
      admin = new Admin({
        username: process.env.DEFAULT_ADMIN_USERNAME,
        password: process.env.DEFAULT_ADMIN_PASSWORD
      });
      await admin.save();
      console.log('✅ Admin par défaut créé');
    }

    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ 
        message: 'Identifiants invalides' 
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { 
        adminId: admin._id, 
        username: admin.username,
        type: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        lastLogin: admin.lastLogin
      },
      token
    });

  } catch (error) {
    console.error('Erreur connexion admin:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion admin' });
  }
});

// Vérification de token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type === 'player') {
      const player = await Player.findById(decoded.playerId);
      if (!player) {
        return res.status(401).json({ message: 'Joueur non trouvé' });
      }
      
      res.json({
        valid: true,
        type: 'player',
        user: {
          id: player._id,
          pseudo: player.pseudo,
          avatar: player.avatar,
          totalScore: player.totalScore
        }
      });
    } else if (decoded.type === 'admin') {
      const admin = await Admin.findById(decoded.adminId);
      if (!admin) {
        return res.status(401).json({ message: 'Admin non trouvé' });
      }
      
      res.json({
        valid: true,
        type: 'admin',
        user: {
          id: admin._id,
          username: admin.username
        }
      });
    } else {
      res.status(401).json({ message: 'Type de token invalide' });
    }

  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
});

module.exports = router;