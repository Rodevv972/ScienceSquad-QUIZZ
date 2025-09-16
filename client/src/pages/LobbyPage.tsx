import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { gameAPI } from '../utils/api';
import { Game, Player } from '../types';
import { Users, Gamepad2, LogOut, Trophy, Wifi, WifiOff } from 'lucide-react';

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userType, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [connectedPlayers, setConnectedPlayers] = useState<Player[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const player = user as Player;

  useEffect(() => {
    const player = user as Player;

    if (userType !== 'player') {
      navigate('/');
      return;
    }

    if (!socket || !isConnected) {
      setError('Connexion au serveur en cours...');
      return;
    }

    // Rejoindre le lobby
    socket.emit('join-lobby', {
      pseudo: player?.pseudo,
      avatar: player?.avatar
    });

    // Écouter les événements du lobby
    socket.on('lobby-joined', (data: any) => {
      console.log('Rejoint le lobby:', data);
      setError('');
    });

    socket.on('lobby-updated', (players: Player[]) => {
      setConnectedPlayers(players);
    });

    socket.on('game-available', (gameData: Game) => {
      setAvailableGames(prev => [gameData, ...prev]);
    });

    socket.on('game-joined', (data: { gameId: string }) => {
      navigate(`/game/${data.gameId}`);
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    // Charger les parties disponibles
    loadAvailableGames();

    // Nettoyage
    return () => {
      if (socket) {
        socket.off('lobby-joined');
        socket.off('lobby-updated');
        socket.off('game-available');
        socket.off('game-joined');
        socket.off('error');
      }
    };
  }, [socket, isConnected, userType, user, navigate]);

  const loadAvailableGames = async () => {
    try {
      const games = await gameAPI.getAvailableGames();
      setAvailableGames(games);
    } catch (error) {
      console.error('Erreur lors du chargement des parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = (gameId: string) => {
    if (socket && isConnected) {
      socket.emit('join-game', gameId);
    } else {
      setError('Connexion au serveur requise');
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
    <div className="lobby-page">
      <div className="container">
        {/* Header */}
        <header className="lobby-header">
          <div className="lobby-title">
            <h1>
              <Users size={32} />
              Lobby du Quiz
            </h1>
            <div className="connection-status">
              {isConnected ? (
                <span className="status-connected">
                  <Wifi size={16} />
                  Connecté
                </span>
              ) : (
                <span className="status-disconnected">
                  <WifiOff size={16} />
                  Déconnecté
                </span>
              )}
            </div>
          </div>
          
          <div className="user-info">
            <div className="user-avatar">
              {player?.avatar ? (
                typeof player.avatar === 'string' && player.avatar.startsWith('/') ? (
                  <img src={`http://localhost:5000${player.avatar}`} alt="Avatar" />
                ) : (
                  <span>{player.avatar}</span>
                )
              ) : (
                <Users size={24} />
              )}
            </div>
            <div className="user-details">
              <div className="user-pseudo">{player?.pseudo}</div>
              <div className="user-score">Score total: {player?.totalScore || 0}</div>
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

        <div className="lobby-content">
          {/* Parties disponibles */}
          <section className="available-games">
            <h2 className="section-title">
              <Gamepad2 size={24} />
              Parties Disponibles
            </h2>
            
            {availableGames.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Gamepad2 size={48} />
                </div>
                <h3>Aucune partie disponible</h3>
                <p>Attendez qu'un administrateur lance une nouvelle partie</p>
              </div>
            ) : (
              <div className="games-list">
                {availableGames.map((game) => (
                  <div key={game.gameId} className="game-item fade-in">
                    <div className="game-info">
                      <div className="game-id">#{game.gameId}</div>
                      <div className="game-details">
                        <div className="game-creator">Créée par: {game.createdBy}</div>
                        <div className="game-players">
                          {game.players.length} joueur(s) connecté(s)
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => joinGame(game.gameId)}
                      className="btn btn-primary"
                      disabled={!isConnected}
                    >
                      Rejoindre
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Joueurs connectés */}
          <section className="connected-players">
            <h2 className="section-title">
              <Users size={24} />
              Joueurs Connectés ({connectedPlayers.length})
            </h2>
            
            <div className="players-grid">
              {connectedPlayers.map((player, index) => (
                <div key={index} className="player-card">
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
                  <div className="player-name">{player.pseudo}</div>
                  {player.pseudo === (user as Player)?.pseudo && (
                    <div className="current-player-badge">Vous</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Actions */}
        <div className="lobby-actions">
          <button
            onClick={() => navigate('/leaderboard')}
            className="btn btn-secondary"
          >
            <Trophy size={16} />
            Voir le Classement
          </button>
          
          <button
            onClick={loadAvailableGames}
            className="btn btn-secondary"
            disabled={loading}
          >
            Actualiser
          </button>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;