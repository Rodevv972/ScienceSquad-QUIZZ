import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Créer une instance axios avec configuration par défaut
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('quiz_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('quiz_token');
      localStorage.removeItem('quiz_user');
      localStorage.removeItem('quiz_user_type');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API d'authentification
export const authAPI = {
  // Connexion joueur
  playerLogin: async (pseudo: string, avatar?: string) => {
    const response = await api.post('/auth/player/login', { pseudo, avatar });
    return response.data;
  },

  // Upload d'avatar
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/auth/player/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Connexion admin
  adminLogin: async (username: string, password: string) => {
    const response = await api.post('/auth/admin/login', { username, password });
    return response.data;
  },

  // Vérification de token
  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
};

// API des parties
export const gameAPI = {
  // Obtenir les parties disponibles
  getAvailableGames: async () => {
    const response = await api.get('/game/available');
    return response.data;
  },

  // Obtenir les détails d'une partie
  getGameDetails: async (gameId: string) => {
    const response = await api.get(`/game/${gameId}`);
    return response.data;
  },

  // Obtenir l'historique des parties
  getGameHistory: async (page = 1, limit = 20) => {
    const response = await api.get(`/game/history/all?page=${page}&limit=${limit}`);
    return response.data;
  },
};

// API du leaderboard
export const leaderboardAPI = {
  // Leaderboard global
  getGlobalLeaderboard: async () => {
    const response = await api.get('/leaderboard/global');
    return response.data;
  },

  // Leaderboard hebdomadaire
  getWeeklyLeaderboard: async () => {
    const response = await api.get('/leaderboard/weekly');
    return response.data;
  },

  // Statistiques d'un joueur
  getPlayerStats: async (pseudo: string) => {
    const response = await api.get(`/leaderboard/player/${pseudo}`);
    return response.data;
  },

  // Statistiques générales
  getGeneralStats: async () => {
    const response = await api.get('/leaderboard/stats/general');
    return response.data;
  },
};

// API d'administration
export const adminAPI = {
  // Gestion des joueurs
  getPlayers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/players?${queryString}`);
    return response.data;
  },

  getPlayerDetails: async (playerId: string) => {
    const response = await api.get(`/admin/players/${playerId}`);
    return response.data;
  },

  banPlayer: async (playerId: string, reason: string, banType = 'temporary', duration = 24) => {
    const response = await api.post(`/admin/players/${playerId}/ban`, {
      reason, banType, duration
    });
    return response.data;
  },

  unbanPlayer: async (playerId: string) => {
    const response = await api.post(`/admin/players/${playerId}/unban`);
    return response.data;
  },

  resetPlayerScore: async (playerId: string) => {
    const response = await api.post(`/admin/players/${playerId}/reset-score`);
    return response.data;
  },

  // Gestion des parties
  getGames: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/games?${queryString}`);
    return response.data;
  },

  getGameDetails: async (gameId: string) => {
    const response = await api.get(`/admin/games/${gameId}`);
    return response.data;
  },

  deleteGame: async (gameId: string) => {
    const response = await api.delete(`/admin/games/${gameId}`);
    return response.data;
  },

  modifyGameSettings: async (gameId: string, settings: any) => {
    const response = await api.put(`/admin/games/${gameId}/settings`, settings);
    return response.data;
  },

  endGame: async (gameId: string) => {
    const response = await api.post(`/admin/games/${gameId}/end`);
    return response.data;
  },

  getGameHistory: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/games/history/detailed?${queryString}`);
    return response.data;
  },

  // Gestion des questions
  getQuestions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/questions?${queryString}`);
    return response.data;
  },

  getQuestionCategories: async () => {
    const response = await api.get('/admin/questions/categories');
    return response.data;
  },

  createQuestion: async (questionData: any) => {
    const response = await api.post('/admin/questions', questionData);
    return response.data;
  },

  updateQuestion: async (questionId: string, questionData: any) => {
    const response = await api.put(`/admin/questions/${questionId}`, questionData);
    return response.data;
  },

  deleteQuestion: async (questionId: string) => {
    const response = await api.delete(`/admin/questions/${questionId}`);
    return response.data;
  },

  importQuestions: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/questions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  exportQuestions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/questions/export?${queryString}`);
    return response.data;
  },

  getQuestionStats: async () => {
    const response = await api.get('/admin/questions/statistics');
    return response.data;
  },

  // Statistiques
  getDashboardStats: async () => {
    const response = await api.get('/admin/statistics/dashboard');
    return response.data;
  },

  getPlayerTimeline: async (period = '7d') => {
    const response = await api.get(`/admin/statistics/players/timeline?period=${period}`);
    return response.data;
  },

  getGameStats: async () => {
    const response = await api.get('/admin/statistics/games/stats');
    return response.data;
  },

  getLeaderboardStats: async () => {
    const response = await api.get('/admin/statistics/leaderboard');
    return response.data;
  },

  getRealtimeActivity: async () => {
    const response = await api.get('/admin/statistics/activity/realtime');
    return response.data;
  },

  // Gestion des admins
  getAdmins: async () => {
    const response = await api.get('/admin/admins');
    return response.data;
  },

  createAdmin: async (adminData: any) => {
    const response = await api.post('/admin/admins', adminData);
    return response.data;
  },

  updateAdminPermissions: async (adminId: string, permissions: any, role?: string) => {
    const response = await api.put(`/admin/admins/${adminId}/permissions`, {
      permissions, role
    });
    return response.data;
  },

  deactivateAdmin: async (adminId: string) => {
    const response = await api.delete(`/admin/admins/${adminId}`);
    return response.data;
  },

  changeAdminPassword: async (adminId: string, currentPassword: string, newPassword: string) => {
    const response = await api.put(`/admin/admins/${adminId}/password`, {
      currentPassword, newPassword
    });
    return response.data;
  },

  getAdminLogs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/admins/logs?${queryString}`);
    return response.data;
  },

  // Notifications
  getNotifications: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/notifications?${queryString}`);
    return response.data;
  },

  sendGlobalNotification: async (notificationData: any) => {
    const response = await api.post('/admin/notifications/global', notificationData);
    return response.data;
  },

  sendPersonalNotification: async (notificationData: any) => {
    const response = await api.post('/admin/notifications/personal', notificationData);
    return response.data;
  },

  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/admin/notifications/${notificationId}`);
    return response.data;
  },

  getNotificationStats: async () => {
    const response = await api.get('/admin/notifications/stats');
    return response.data;
  },

  // Sécurité
  getSecurityAlerts: async () => {
    const response = await api.get('/admin/security/alerts');
    return response.data;
  },

  getSystemHealth: async () => {
    const response = await api.get('/admin/security/health');
    return response.data;
  },

  toggleMaintenance: async (enabled: boolean, message?: string) => {
    const response = await api.post('/admin/security/maintenance', {
      enabled, message
    });
    return response.data;
  },

  getMonitoringActions: async (hours = 24) => {
    const response = await api.get(`/admin/security/monitoring/actions?hours=${hours}`);
    return response.data;
  },

  createSecurityAlert: async (alertData: any) => {
    const response = await api.post('/admin/security/alerts', alertData);
    return response.data;
  }
};

export default api;