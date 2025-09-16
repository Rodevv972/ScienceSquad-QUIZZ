import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Question, QuestionResult, Game } from '../types';
import { Clock, Users, Trophy, Home, CheckCircle, XCircle } from 'lucide-react';

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [game, setGame] = useState<Game | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userType !== 'player' || !gameId) {
      navigate('/');
      return;
    }

    if (!socket || !isConnected) {
      setError('Connexion au serveur requise');
      return;
    }

    // Écouter les événements du jeu
    socket.on('game-joined', (data: any) => {
      console.log('Partie rejointe:', data);
      setLoading(false);
    });

    socket.on('game-updated', (gameData: Game) => {
      setGame(gameData);
    });

    socket.on('game-started', () => {
      console.log('Partie démarrée');
      setShowResults(false);
    });

    socket.on('new-question', (question: Question) => {
      setCurrentQuestion(question);
      setTimeLeft(question.timeLimit);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setQuestionResult(null);
      setShowResults(false);
    });

    socket.on('question-ended', (result: QuestionResult) => {
      setQuestionResult(result);
      setShowResults(true);
    });

    socket.on('answer-submitted', (data: { isCorrect: boolean }) => {
      console.log('Réponse soumise:', data);
    });

    socket.on('game-ended', (data: { results: any[] }) => {
      console.log('Partie terminée:', data);
      // Rediriger vers le lobby après 10 secondes
      setTimeout(() => {
        navigate('/lobby');
      }, 10000);
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
      setLoading(false);
    });

    // Rejoindre la partie
    socket.emit('join-game', gameId);

    // Nettoyage
    return () => {
      if (socket) {
        socket.off('game-joined');
        socket.off('game-updated');
        socket.off('game-started');
        socket.off('new-question');
        socket.off('question-ended');
        socket.off('answer-submitted');
        socket.off('game-ended');
        socket.off('error');
      }
    };
  }, [socket, isConnected, userType, gameId, navigate]);

  // Timer pour les questions
  useEffect(() => {
    if (currentQuestion && !showResults && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentQuestion, timeLeft, showResults]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (hasAnswered || showResults || timeLeft <= 0) return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);

    if (socket && currentQuestion) {
      socket.emit('submit-answer', {
        gameId,
        questionIndex: currentQuestion.index,
        answer: answerIndex
      });
    }
  };

  const handleLeaveGame = () => {
    navigate('/lobby');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Connexion à la partie...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-error">
        <div className="container">
          <div className="error-card">
            <h2>Erreur</h2>
            <p>{error}</p>
            <button onClick={handleLeaveGame} className="btn btn-primary">
              <Home size={16} />
              Retour au Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="container">
        {/* Header de la partie */}
        <header className="game-header">
          <div className="game-info">
            <h1>Quiz Live #{gameId}</h1>
            <div className="game-stats">
              <span className="player-count">
                <Users size={16} />
                {game?.players.length || 0} joueurs
              </span>
              {game?.status && (
                <span className={`game-status status-${game.status}`}>
                  {game.status === 'waiting' && 'En attente'}
                  {game.status === 'active' && 'En cours'}
                  {game.status === 'finished' && 'Terminé'}
                </span>
              )}
            </div>
          </div>
          <button onClick={handleLeaveGame} className="btn btn-secondary">
            <Home size={16} />
            Quitter
          </button>
        </header>

        {game?.status === 'waiting' && (
          <div className="waiting-room">
            <div className="waiting-card">
              <h2>Salle d'attente</h2>
              <p>En attente du démarrage de la partie par l'administrateur...</p>
              
              <div className="players-list">
                <h3>Joueurs connectés:</h3>
                <div className="players-grid">
                  {game.players.map((player, index) => (
                    <div key={index} className="player-item">
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
                      <span className="player-name">{player.pseudo}</span>
                      <span className="player-score">{player.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {game?.status === 'active' && currentQuestion && !showResults && (
          <div className="question-section">
            <div className="question-header">
              <div className="question-timer">
                <Clock size={24} />
                <span className={`timer ${timeLeft <= 5 ? 'urgent' : ''}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="question-number">
                Question {currentQuestion.index + 1}
              </div>
            </div>

            <div className="question-card">
              <h2 className="question-text">{currentQuestion.question}</h2>
              
              <div className="answers-grid">
                {currentQuestion.choices.map((choice, index) => (
                  <button
                    key={index}
                    className={`answer-option ${
                      selectedAnswer === index ? 'selected' : ''
                    } ${hasAnswered ? 'disabled' : ''}`}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={hasAnswered || timeLeft <= 0}
                  >
                    <span className="answer-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="answer-text">{choice}</span>
                  </button>
                ))}
              </div>

              {hasAnswered && (
                <div className="answer-feedback">
                  <CheckCircle size={20} />
                  Réponse enregistrée !
                </div>
              )}
            </div>
          </div>
        )}

        {showResults && questionResult && (
          <div className="results-section">
            <div className="results-card">
              <div className="correct-answer">
                <h3>
                  {questionResult.results.find(r => r.pseudo === (user as any)?.pseudo)?.correct ? (
                    <><CheckCircle size={24} /> Bonne réponse !</>
                  ) : (
                    <><XCircle size={24} /> Mauvaise réponse</>
                  )}
                </h3>
                <p>
                  La bonne réponse était : <strong>
                    {currentQuestion?.choices[questionResult.correctAnswer]}
                  </strong>
                </p>
              </div>

              <div className="explanation">
                <h4>Explication:</h4>
                <p>{questionResult.explanation}</p>
              </div>

              <div className="question-leaderboard">
                <h4>Classement après cette question:</h4>
                <div className="leaderboard-list">
                  {questionResult.results
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .slice(0, 5)
                    .map((result, index) => (
                      <div 
                        key={result.pseudo} 
                        className={`leaderboard-item ${
                          result.pseudo === (user as any)?.pseudo ? 'current-player' : ''
                        }`}
                      >
                        <span className="rank">#{index + 1}</span>
                        <div className="player-info">
                          <span className="pseudo">{result.pseudo}</span>
                          <span className="score">
                            {result.totalScore} pts
                            {result.questionScore > 0 && (
                              <span className="score-gain">+{result.questionScore}</span>
                            )}
                          </span>
                        </div>
                        {result.correct && <CheckCircle size={16} className="correct-icon" />}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {game?.status === 'finished' && (
          <div className="final-results">
            <div className="final-results-card">
              <h2>
                <Trophy size={32} />
                Partie Terminée !
              </h2>
              <p>Redirection vers le lobby dans quelques secondes...</p>
              
              <button onClick={handleLeaveGame} className="btn btn-primary">
                <Home size={16} />
                Retour au Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;