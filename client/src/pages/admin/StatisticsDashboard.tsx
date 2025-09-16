import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Users, Gamepad2, Activity, 
  ArrowLeft, RefreshCw, Clock, Target 
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import './StatisticsDashboard.css';

interface DashboardStats {
  totalPlayers: number;
  onlinePlayers: number;
  totalGames: number;
  activeGames: number;
  totalQuestions: number;
  recentActions: any[];
}

interface RealtimeActivity {
  activeGames: any[];
  onlinePlayers: any[];
  recentGames: any[];
  systemLoad: any;
}

const StatisticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RealtimeActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadRealtimeActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardStats, realtimeActivity] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getRealtimeActivity()
      ]);
      
      setStats(dashboardStats);
      setActivity(realtimeActivity);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeActivity = async () => {
    try {
      setRefreshing(true);
      const realtimeActivity = await adminAPI.getRealtimeActivity();
      setActivity(realtimeActivity);
    } catch (error) {
      console.error('Error refreshing activity:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatMemoryUsage = (bytes: number) => {
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="statistics-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-dashboard">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/admin')}>
          <ArrowLeft size={20} />
          Retour au dashboard
        </button>
        
        <div className="header-content">
          <div className="header-info">
            <div className="header-icon">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1>Statistiques Avancées</h1>
              <p>Surveillance en temps réel du système</p>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className={`btn btn-secondary ${refreshing ? 'refreshing' : ''}`}
              onClick={loadRealtimeActivity}
              disabled={refreshing}
            >
              <RefreshCw size={16} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {stats && (
        <div className="stats-grid">
          {/* Overview Cards */}
          <div className="stat-card primary">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalPlayers}</div>
              <div className="stat-label">Joueurs Inscrits</div>
              <div className="stat-detail">
                {stats.onlinePlayers} en ligne maintenant
              </div>
            </div>
          </div>

          <div className="stat-card secondary">
            <div className="stat-icon">
              <Gamepad2 size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalGames}</div>
              <div className="stat-label">Parties Totales</div>
              <div className="stat-detail">
                {stats.activeGames} actives
              </div>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">
              <Target size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalQuestions}</div>
              <div className="stat-label">Questions</div>
              <div className="stat-detail">Base de données</div>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">
              <Activity size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.recentActions.length}</div>
              <div className="stat-label">Actions Récentes</div>
              <div className="stat-detail">Dernière heure</div>
            </div>
          </div>
        </div>
      )}

      {activity && (
        <div className="activity-grid">
          {/* Active Games */}
          <div className="activity-card">
            <div className="card-header">
              <h3>
                <Gamepad2 size={20} />
                Parties Actives
              </h3>
              <span className="count">{activity.activeGames.length}</span>
            </div>
            <div className="card-content">
              {activity.activeGames.length === 0 ? (
                <div className="empty-state">
                  <p>Aucune partie active</p>
                </div>
              ) : (
                <div className="game-list">
                  {activity.activeGames.map((game: any) => (
                    <div key={game.gameId} className="game-item">
                      <div className="game-info">
                        <div className="game-id">{game.gameId}</div>
                        <div className="game-details">
                          <span>{game.playerCount} joueurs</span>
                          <span>Q{game.currentQuestion || 0}</span>
                        </div>
                      </div>
                      <div className="game-status active">Actif</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Online Players */}
          <div className="activity-card">
            <div className="card-header">
              <h3>
                <Users size={20} />
                Joueurs En Ligne
              </h3>
              <span className="count">{activity.onlinePlayers.length}</span>
            </div>
            <div className="card-content">
              {activity.onlinePlayers.length === 0 ? (
                <div className="empty-state">
                  <p>Aucun joueur en ligne</p>
                </div>
              ) : (
                <div className="player-list">
                  {activity.onlinePlayers.slice(0, 10).map((player: any) => (
                    <div key={player._id} className="player-item">
                      <div className="player-info">
                        <div className="player-name">{player.pseudo}</div>
                        <div className="player-activity">
                          Actif: {new Date(player.lastActive).toLocaleTimeString('fr-FR')}
                        </div>
                      </div>
                      <div className="online-indicator"></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Games */}
          <div className="activity-card">
            <div className="card-header">
              <h3>
                <Clock size={20} />
                Parties Récentes
              </h3>
              <span className="count">{activity.recentGames.length}</span>
            </div>
            <div className="card-content">
              {activity.recentGames.length === 0 ? (
                <div className="empty-state">
                  <p>Aucune partie récente</p>
                </div>
              ) : (
                <div className="recent-game-list">
                  {activity.recentGames.map((game: any) => (
                    <div key={game.gameId} className="recent-game-item">
                      <div className="game-info">
                        <div className="game-id">{game.gameId}</div>
                        <div className="game-meta">
                          {game.playerCount} joueurs • 
                          Terminée: {new Date(game.endedAt).toLocaleTimeString('fr-FR')}
                        </div>
                      </div>
                      <div className="game-status finished">Terminée</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Load */}
          <div className="activity-card">
            <div className="card-header">
              <h3>
                <Activity size={20} />
                Performance Système
              </h3>
              <span className="status-good">Bon</span>
            </div>
            <div className="card-content">
              <div className="system-metrics">
                <div className="metric">
                  <div className="metric-label">Mémoire utilisée</div>
                  <div className="metric-value">
                    {formatMemoryUsage(activity.systemLoad.memoryUsage.heapUsed)} / 
                    {formatMemoryUsage(activity.systemLoad.memoryUsage.heapTotal)}
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${(activity.systemLoad.memoryUsage.heapUsed / activity.systemLoad.memoryUsage.heapTotal) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="metric">
                  <div className="metric-label">Uptime</div>
                  <div className="metric-value">
                    {formatUptime(activity.systemLoad.uptime)}
                  </div>
                </div>
                
                <div className="metric">
                  <div className="metric-label">Dernière mise à jour</div>
                  <div className="metric-value">
                    {new Date(activity.systemLoad.timestamp).toLocaleTimeString('fr-FR')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsDashboard;