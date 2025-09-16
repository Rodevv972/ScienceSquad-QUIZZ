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

export default api;