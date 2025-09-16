import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { gameAPI, leaderboardAPI } from '../utils/api';
import { Game, GameStats } from '../types';
import { Trophy, Users, Gamepad2, TrendingUp } from 'lucide-react';

const HomePage: React.FC = () => {
  const { isAuthenticated, userType } = useAuth();
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gamesData, statsData] = await Promise.all([
          gameAPI.getAvailableGames(),
          leaderboardAPI.getGeneralStats(),
        ]);
        
        setAvailableGames(gamesData);
        setStats(statsData);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Header */}
      <header className="hero-section">
        <div className="container">
          <div className="hero-content fade-in">
            <h1 className="hero-title">ScienceSquad Quiz</h1>
            <p className="hero-subtitle">
              Participez à des quiz en temps réel et testez vos connaissances !
            </p>
            
            {!isAuthenticated ? (
              <div className="hero-actions">
                <Link to="/login" className="btn btn-primary btn-large">
                  <Users size={20} />
                  Rejoindre en tant que Joueur
                </Link>
                <Link to="/admin/login" className="btn btn-secondary">
                  Accès Administrateur
                </Link>
              </div>
            ) : (
              <div className="hero-actions">
                {userType === 'player' && (
                  <Link to="/lobby" className="btn btn-primary btn-large">
                    <Gamepad2 size={20} />
                    Accéder au Lobby
                  </Link>
                )}
                {userType === 'admin' && (
                  <Link to="/admin/dashboard" className="btn btn-primary btn-large">
                    Tableau de Bord Admin
                  </Link>
                )}
                <Link to="/leaderboard" className="btn btn-secondary">
                  <Trophy size={20} />
                  Classements
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Statistiques */}
      {stats && (
        <section className="stats-section">
          <div className="container">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <Users size={32} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.totalPlayers}</div>
                  <div className="stat-label">Joueurs Inscrits</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <TrendingUp size={32} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.activePlayers}</div>
                  <div className="stat-label">Joueurs Actifs (24h)</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <Gamepad2 size={32} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.totalGames}</div>
                  <div className="stat-label">Parties Jouées</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <Trophy size={32} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{stats.topPlayer?.pseudo || 'N/A'}</div>
                  <div className="stat-label">Meilleur Joueur</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Parties en cours */}
      {availableGames.length > 0 && (
        <section className="games-section">
          <div className="container">
            <h2 className="section-title">Parties en Attente</h2>
            <div className="games-grid">
              {availableGames.map((game) => (
                <div key={game.gameId} className="game-card">
                  <div className="game-header">
                    <h3 className="game-id">#{game.gameId}</h3>
                    <span className="game-status">En attente</span>
                  </div>
                  <div className="game-info">
                    <p className="game-creator">Créée par: {game.createdBy}</p>
                    <p className="game-players">
                      {game.players.length} joueur(s) connecté(s)
                    </p>
                  </div>
                  {isAuthenticated && userType === 'player' && (
                    <Link 
                      to={`/game/${game.gameId}`} 
                      className="btn btn-primary btn-small"
                    >
                      Rejoindre
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Comment jouer */}
      <section className="how-to-play">
        <div className="container">
          <h2 className="section-title">Comment Jouer</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Créez votre Profil</h3>
              <p>Choisissez un pseudo unique et sélectionnez votre avatar</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Rejoignez le Lobby</h3>
              <p>Attendez qu'un administrateur lance une nouvelle partie</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Répondez aux Questions</h3>
              <p>Vous avez 15 secondes pour chaque question. Plus vous êtes rapide, plus vous gagnez de points !</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Grimpez dans le Classement</h3>
              <p>Accumulez des points et devenez le champion du quiz !</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 ScienceSquad Quiz. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;