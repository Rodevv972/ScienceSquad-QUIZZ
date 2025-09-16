import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Game, GameStats, AdminDashboardStats } from '../types';
import { 
  Shield, LogOut, Plus, Play, SkipForward, Square, 
  Users, Gamepad2, Trophy, Settings, Eye, 
  HelpCircle, BarChart3, UserCog, Bell, AlertTriangle,
  Activity
} from 'lucide-react';
import { adminAPI } from '../utils/api';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userType, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStats | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userType !== 'admin') {
      navigate('/');
      return;
    }

    if (!socket || !isConnected) {
      setError('Connexion au serveur en cours...');
      return;
    }

    // Écouter les événements admin
    socket.on('game-created', (data: { gameId: string }) => {
      console.log('Partie créée:', data.gameId);
      setIsCreatingGame(false);
      loadCurrentGame();
    });

    socket.on('game-updated', (gameData: Game) => {
      setCurrentGame(gameData);
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
      setIsCreatingGame(false);
    });

    // Charger les données initiales
    loadStats();
    loadCurrentGame();

    // Nettoyage
    return () => {
      if (socket) {
        socket.off('game-created');
        socket.off('game-updated');
        socket.off('error');
      }
    };
  }, [socket, isConnected, userType, navigate]);

  const loadStats = async () => {
    try {
      // Load enhanced dashboard statistics
      const dashboardData = await adminAPI.getDashboardStats();
      setDashboardStats(dashboardData);
      
      // Keep compatibility with existing stats
      setStats({
        totalPlayers: dashboardData.totalPlayers,
        activePlayers: dashboardData.onlinePlayers,
        totalGames: dashboardData.totalGames,
        activeGames: dashboardData.activeGames
      });
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
      // Fallback to empty stats
      setStats({
        totalPlayers: 0,
        activePlayers: 0,
        totalGames: 0,
        activeGames: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentGame = () => {
    // Charger la partie active s'il y en a une
    // Pour l'instant, on simule l'absence de partie
    setCurrentGame(null);
  };

  const handleCreateGame = () => {
    if (!socket || isCreatingGame) return;

    setIsCreatingGame(true);
    setError('');

    socket.emit('admin-action', {
      type: 'create-game',
      data: {
        adminName: (user as any)?.username || 'Admin'
      }
    });
  };

  const handleStartGame = () => {
    if (!socket || !currentGame) return;

    socket.emit('admin-action', {
      type: 'start-game',
      gameId: currentGame.gameId
    });
  };

  const handleNextQuestion = () => {
    if (!socket || !currentGame) return;

    socket.emit('admin-action', {
      type: 'next-question',
      gameId: currentGame.gameId
    });
  };

  const handleEndGame = () => {
    if (!socket || !currentGame) return;

    if (window.confirm('Êtes-vous sûr de vouloir terminer la partie ?')) {
      socket.emit('admin-action', {
        type: 'end-game',
        gameId: currentGame.gameId
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-title">
            <h1>
              <Shield size={32} />
              Tableau de Bord Admin
            </h1>
            <span className="admin-badge">Administrateur</span>
          </div>
          
          <div className="admin-info">
            <div className="admin-details">
              <div className="admin-name">
                Connecté en tant que: <strong>{(user as any)?.username}</strong>
              </div>
              <div className="connection-status">
                {isConnected ? (
                  <span className="status-connected">🟢 Connecté</span>
                ) : (
                  <span className="status-disconnected">🔴 Déconnecté</span>
                )}
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </header>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* Statistiques */}
        {stats && (
          <section className="admin-stats">
            <h2 className="section-title">Statistiques du Serveur</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <Users size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.totalPlayers}</div>
                  <div className="stat-label">Joueurs Inscrits</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <Eye size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.activePlayers}</div>
                  <div className="stat-label">Joueurs Actifs</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <Gamepad2 size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.totalGames}</div>
                  <div className="stat-label">Parties Jouées</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <Trophy size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.topPlayer?.pseudo || 'N/A'}</div>
                  <div className="stat-label">Meilleur Joueur</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Enhanced Admin Management Sections */}
        <section className="admin-management">
          <h2 className="section-title">Gestion Avancée</h2>
          <div className="management-grid">
            {/* Player Management */}
            <div className="management-card" onClick={() => navigate('/admin/players')}>
              <div className="card-icon players">
                <Users size={24} />
              </div>
              <div className="card-content">
                <h3>Gestion des Joueurs</h3>
                <p>Bannir, réinitialiser scores, historique</p>
                <div className="card-stats">
                  {dashboardStats && (
                    <span>{dashboardStats.onlinePlayers} en ligne</span>
                  )}
                </div>
              </div>
            </div>

            {/* Game Management */}
            <div className="management-card" onClick={() => navigate('/admin/games')}>
              <div className="card-icon games">
                <Gamepad2 size={24} />
              </div>
              <div className="card-content">
                <h3>Gestion des Parties</h3>
                <p>Modifier, supprimer, historique détaillé</p>
                <div className="card-stats">
                  {dashboardStats && (
                    <span>{dashboardStats.activeGames} actives</span>
                  )}
                </div>
              </div>
            </div>

            {/* Question Management */}
            <div className="management-card" onClick={() => navigate('/admin/questions')}>
              <div className="card-icon questions">
                <HelpCircle size={24} />
              </div>
              <div className="card-content">
                <h3>Gestion des Questions</h3>
                <p>CRUD, import/export, catégories</p>
                <div className="card-stats">
                  {dashboardStats && (
                    <span>{dashboardStats.totalQuestions} questions</span>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics Dashboard */}
            <div className="management-card" onClick={() => navigate('/admin/statistics')}>
              <div className="card-icon statistics">
                <BarChart3 size={24} />
              </div>
              <div className="card-content">
                <h3>Statistiques Avancées</h3>
                <p>Graphiques, analytiques, monitoring</p>
                <div className="card-stats">
                  <span>Temps réel</span>
                </div>
              </div>
            </div>

            {/* Admin Management */}
            <div className="management-card" onClick={() => navigate('/admin/admins')}>
              <div className="card-icon admins">
                <UserCog size={24} />
              </div>
              <div className="card-content">
                <h3>Gestion des Admins</h3>
                <p>Rôles, permissions, logs d'actions</p>
                <div className="card-stats">
                  <span>Sécurisé</span>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="management-card" onClick={() => navigate('/admin/notifications')}>
              <div className="card-icon notifications">
                <Bell size={24} />
              </div>
              <div className="card-content">
                <h3>Notifications</h3>
                <p>Messages globaux et personnels</p>
                <div className="card-stats">
                  <span>Communication</span>
                </div>
              </div>
            </div>

            {/* Security & Monitoring */}
            <div className="management-card" onClick={() => navigate('/admin/security')}>
              <div className="card-icon security">
                <AlertTriangle size={24} />
              </div>
              <div className="card-content">
                <h3>Sécurité & Monitoring</h3>
                <p>Alertes, santé système, maintenance</p>
                <div className="card-stats">
                  <span>Surveillance</span>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="management-card" onClick={() => navigate('/admin/system')}>
              <div className="card-icon system">
                <Activity size={24} />
              </div>
              <div className="card-content">
                <h3>État du Système</h3>
                <p>Performance, logs, maintenance</p>
                <div className="card-stats">
                  <span>Opérationnel</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h2 className="section-title">Actions Rapides</h2>
          <div className="actions-grid">
            <button className="action-btn primary" onClick={() => navigate('/admin/notifications')}>
              <Bell size={20} />
              Envoyer une Annonce
            </button>
            <button className="action-btn secondary" onClick={() => navigate('/admin/players')}>
              <Users size={20} />
              Voir les Joueurs
            </button>
            <button className="action-btn secondary" onClick={() => navigate('/admin/statistics')}>
              <BarChart3 size={20} />
              Statistiques Live
            </button>
            <button className="action-btn warning" onClick={() => navigate('/admin/security')}>
              <AlertTriangle size={20} />
              Alertes Sécurité
            </button>
          </div>
        </section>

        {/* Gestion des parties */}
        <section className="game-management">
          <h2 className="section-title">Gestion des Parties</h2>
          
          {!currentGame ? (
            <div className="no-game">
              <div className="no-game-card">
                <div className="no-game-icon">
                  <Gamepad2 size={48} />
                </div>
                <h3>Aucune partie active</h3>
                <p>Créez une nouvelle partie pour commencer un quiz en direct</p>
                
                <button
                  onClick={handleCreateGame}
                  className="btn btn-primary btn-large"
                  disabled={isCreatingGame || !isConnected}
                >
                  {isCreatingGame ? (
                    <>
                      <div className="spinner"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Créer une Nouvelle Partie
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="current-game">
              <div className="game-card">
                <div className="game-header">
                  <div className="game-info">
                    <h3>Partie #{currentGame.gameId}</h3>
                    <span className={`game-status status-${currentGame.status}`}>
                      {currentGame.status === 'waiting' && 'En attente'}
                      {currentGame.status === 'active' && 'En cours'}
                      {currentGame.status === 'finished' && 'Terminée'}
                    </span>
                  </div>
                  <div className="game-stats">
                    <span className="player-count">
                      <Users size={16} />
                      {currentGame.players.length} joueurs
                    </span>
                  </div>
                </div>

                <div className="game-controls">
                  {currentGame.status === 'waiting' && (
                    <>
                      <button
                        onClick={handleStartGame}
                        className="btn btn-success"
                        disabled={currentGame.players.length === 0 || !isConnected}
                      >
                        <Play size={16} />
                        Démarrer la Partie
                      </button>
                      <button
                        onClick={handleEndGame}
                        className="btn btn-danger"
                        disabled={!isConnected}
                      >
                        <Square size={16} />
                        Annuler la Partie
                      </button>
                    </>
                  )}
                  
                  {currentGame.status === 'active' && (
                    <>
                      <button
                        onClick={handleNextQuestion}
                        className="btn btn-primary"
                        disabled={!isConnected}
                      >
                        <SkipForward size={16} />
                        Question Suivante
                      </button>
                      <button
                        onClick={handleEndGame}
                        className="btn btn-danger"
                        disabled={!isConnected}
                      >
                        <Square size={16} />
                        Terminer la Partie
                      </button>
                    </>
                  )}
                </div>

                {/* Liste des joueurs */}
                <div className="players-section">
                  <h4>Joueurs connectés:</h4>
                  <div className="players-list">
                    {currentGame.players.length === 0 ? (
                      <p className="no-players">Aucun joueur connecté</p>
                    ) : (
                      <div className="players-grid">
                        {currentGame.players.map((player, index) => (
                          <div key={index} className="player-item">
                            <div className="player-avatar">
                              {player.avatar ? (
                                typeof player.avatar === 'string' && player.avatar.startsWith('/') ? (
                                  <img src={`http://localhost:5000${player.avatar}`} alt="Avatar" />
                                ) : (
                                  <span>{player.avatar}</span>
                                )
                              ) : (
                                <Users size={16} />
                              )}
                            </div>
                            <div className="player-details">
                              <span className="player-name">{player.pseudo}</span>
                              <span className="player-score">{player.score} pts</span>
                            </div>
                            <div className="player-status">
                              {player.isConnected ? (
                                <span className="connected">🟢</span>
                              ) : (
                                <span className="disconnected">🔴</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Actions rapides */}
        <section className="quick-actions">
          <h2 className="section-title">Actions Rapides</h2>
          <div className="actions-grid">
            <button 
              onClick={() => navigate('/leaderboard')}
              className="btn btn-secondary"
            >
              <Trophy size={16} />
              Voir le Classement
            </button>
            
            <button 
              onClick={loadStats}
              className="btn btn-secondary"
            >
              <Settings size={16} />
              Actualiser les Stats
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;