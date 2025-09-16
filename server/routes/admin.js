const express = require('express');
const router = express.Router();

// Import individual admin route modules
const playerRoutes = require('./admin/players');
const gameRoutes = require('./admin/games');
const questionRoutes = require('./admin/questions');
const statisticsRoutes = require('./admin/statistics');
const adminManagementRoutes = require('./admin/admins');
const notificationRoutes = require('./admin/notifications');
const securityRoutes = require('./admin/security');

// Use individual route modules
router.use('/players', playerRoutes);
router.use('/games', gameRoutes);
router.use('/questions', questionRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/admins', adminManagementRoutes);
router.use('/notifications', notificationRoutes);
router.use('/security', securityRoutes);

module.exports = router;