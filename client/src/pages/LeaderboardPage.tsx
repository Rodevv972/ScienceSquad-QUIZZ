import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardAPI } from '../utils/api';
import { LeaderboardEntry } from '../types';
import { Trophy, Medal, Award, ArrowLeft, Users, TrendingUp, Calendar } from 'lucide-react';

const LeaderboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'global' | 'weekly'>('global');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      setLoading(true);
      const [globalData, weeklyData] = await Promise.all([
        leaderboardAPI.getGlobalLeaderboard(),
        leaderboardAPI.getWeeklyLeaderboard()
      ]);
      
      setGlobalLeaderboard(globalData);
      setWeeklyLeaderboard(weeklyData);
    } catch (error) {
      console.error('Erreur lors du chargement des classements:', error);
      setError('Erreur lors du chargement des classements');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={24} className="rank-icon gold" />;
      case 2:
        return <Medal size={24} className="rank-icon silver" />;
      case 3:
        return <Award size={24} className="rank-icon bronze" />;
      default:
        return <span className="rank-number">#{rank}</span>;
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Jamais';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const currentLeaderboard = activeTab === 'global' ? globalLeaderboard : weeklyLeaderboard;

  return (
    <div className="leaderboard-page">
      <div className="container">
        {/* Header */}
        <header className="leaderboard-header">
          <div className="header-content">
            <Link to="/" className="back-link">
              <ArrowLeft size={20} />
              Retour
            </Link>
            <h1 className="page-title">
              <Trophy size={32} />
              Classements
            </h1>
            <p className="page-subtitle">
              Découvrez les meilleurs joueurs de ScienceSquad Quiz
            </p>
          </div>
        </header>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* Onglets */}
        <div className="leaderboard-tabs">
          <button
            className={`tab-button ${activeTab === 'global' ? 'active' : ''}`}
            onClick={() => setActiveTab('global')}
          >
            <TrendingUp size={20} />
            Classement Général
          </button>
          <button
            className={`tab-button ${activeTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            <Calendar size={20} />
            Classement Hebdomadaire
          </button>
        </div>

        {/* Podium */}
        {currentLeaderboard.length >= 3 && (
          <div className="podium">
            <div className="podium-container">
              {/* 2ème place */}
              <div className="podium-position second">
                <div className="player-card">
                  <div className="player-avatar">
                    {currentLeaderboard[1]?.avatar ? (
                      typeof currentLeaderboard[1].avatar === 'string' && currentLeaderboard[1].avatar.startsWith('/') ? (
                        <img src={`http://localhost:5000${currentLeaderboard[1].avatar}`} alt="Avatar" />
                      ) : (
                        <span>{currentLeaderboard[1].avatar}</span>
                      )
                    ) : (
                      <Users size={24} />
                    )}
                  </div>
                  <div className="rank-badge second-place">
                    <Medal size={20} />
                    2
                  </div>
                  <h3 className="player-name">{currentLeaderboard[1]?.pseudo}</h3>
                  <div className="player-score">
                    {activeTab === 'global' 
                      ? currentLeaderboard[1]?.totalScore 
                      : (currentLeaderboard[1] as any)?.weeklyScore || 0
                    } pts
                  </div>
                </div>
              </div>

              {/* 1ère place */}
              <div className="podium-position first">
                <div className="player-card">
                  <div className="player-avatar">
                    {currentLeaderboard[0]?.avatar ? (
                      typeof currentLeaderboard[0].avatar === 'string' && currentLeaderboard[0].avatar.startsWith('/') ? (
                        <img src={`http://localhost:5000${currentLeaderboard[0].avatar}`} alt="Avatar" />
                      ) : (
                        <span>{currentLeaderboard[0].avatar}</span>
                      )
                    ) : (
                      <Users size={28} />
                    )}
                  </div>
                  <div className="rank-badge first-place">
                    <Trophy size={24} />
                    1
                  </div>
                  <h3 className="player-name">{currentLeaderboard[0]?.pseudo}</h3>
                  <div className="player-score">
                    {activeTab === 'global' 
                      ? currentLeaderboard[0]?.totalScore 
                      : (currentLeaderboard[0] as any)?.weeklyScore || 0
                    } pts
                  </div>
                  <div className="crown">👑</div>
                </div>
              </div>

              {/* 3ème place */}
              <div className="podium-position third">
                <div className="player-card">
                  <div className="player-avatar">
                    {currentLeaderboard[2]?.avatar ? (
                      typeof currentLeaderboard[2].avatar === 'string' && currentLeaderboard[2].avatar.startsWith('/') ? (
                        <img src={`http://localhost:5000${currentLeaderboard[2].avatar}`} alt="Avatar" />
                      ) : (
                        <span>{currentLeaderboard[2].avatar}</span>
                      )
                    ) : (
                      <Users size={20} />
                    )}
                  </div>
                  <div className="rank-badge third-place">
                    <Award size={18} />
                    3
                  </div>
                  <h3 className="player-name">{currentLeaderboard[2]?.pseudo}</h3>
                  <div className="player-score">
                    {activeTab === 'global' 
                      ? currentLeaderboard[2]?.totalScore 
                      : (currentLeaderboard[2] as any)?.weeklyScore || 0
                    } pts
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste complète */}
        <div className="leaderboard-list">
          <div className="list-header">
            <h2>
              {activeTab === 'global' ? 'Classement Général' : 'Classement de la Semaine'}
              <span className="player-count">({currentLeaderboard.length} joueurs)</span>
            </h2>
          </div>

          {currentLeaderboard.length === 0 ? (
            <div className="empty-leaderboard">
              <div className="empty-icon">
                <Trophy size={48} />
              </div>
              <h3>Aucun joueur classé</h3>
              <p>Soyez le premier à jouer et à marquer des points !</p>
            </div>
          ) : (
            <div className="players-list">
              {currentLeaderboard.map((player, index) => (
                <div 
                  key={player.pseudo} 
                  className={`player-row ${index < 3 ? 'top-three' : ''}`}
                >
                  <div className="rank">
                    {getRankIcon(player.rank)}
                  </div>
                  
                  <div className="player-info">
                    <div className="player-avatar">
                      {player.avatar ? (
                        typeof player.avatar === 'string' && player.avatar.startsWith('/') ? (
                          <img src={`http://localhost:5000${player.avatar}`} alt="Avatar" />
                        ) : (
                          <span>{player.avatar}</span>
                        )
                      ) : (
                        <Users size={20} />
                      )}
                    </div>
                    <div className="player-details">
                      <span className="player-name">{player.pseudo}</span>
                      {activeTab === 'global' && (
                        <span className="player-games">
                          {player.gamesPlayed} partie(s) · 
                          Moy: {player.averageScore} pts · 
                          Vu le {formatDate(player.lastActive)}
                        </span>
                      )}
                      {activeTab === 'weekly' && (
                        <span className="player-games">
                          {(player as any).weeklyGames || 0} partie(s) cette semaine
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="player-score">
                    <span className="score-value">
                      {activeTab === 'global' 
                        ? player.totalScore 
                        : (player as any).weeklyScore || 0
                      }
                    </span>
                    <span className="score-label">points</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="leaderboard-actions">
          <button
            onClick={loadLeaderboards}
            className="btn btn-primary"
          >
            Actualiser
          </button>
          <Link to="/" className="btn btn-secondary">
            Retour à l'Accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;