export interface Player {
  id: string;
  pseudo: string;
  avatar?: string;
  totalScore: number;
  gamesPlayed: number;
  isOnline?: boolean;
}

export interface Admin {
  id: string;
  username: string;
  lastLogin?: Date;
}

export interface Question {
  index: number;
  question: string;
  choices: string[];
  timeLimit: number;
}

export interface QuestionResult {
  correctAnswer: number;
  explanation: string;
  results: PlayerResult[];
}

export interface PlayerResult {
  pseudo: string;
  avatar?: string;
  questionScore: number;
  totalScore: number;
  answered: boolean;
  correct: boolean;
  timeToAnswer?: number;
}

export interface Game {
  gameId: string;
  status: 'waiting' | 'active' | 'finished';
  players: GamePlayer[];
  currentQuestion?: number;
  totalQuestions?: number;
  createdBy: string;
  createdAt?: Date;
}

export interface GamePlayer {
  pseudo: string;
  avatar?: string;
  score: number;
  isConnected: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  pseudo: string;
  avatar?: string;
  totalScore: number;
  gamesPlayed: number;
  averageScore: number;
  lastActive?: Date;
}

export interface AuthContextType {
  user: Player | Admin | null;
  userType: 'player' | 'admin' | null;
  token: string | null;
  login: (user: Player | Admin, token: string, type: 'player' | 'admin') => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface SocketContextType {
  socket: any | null;
  isConnected: boolean;
}

export interface GameStats {
  totalPlayers: number;
  activePlayers: number;
  totalGames: number;
  activeGames: number;
  topPlayer?: {
    pseudo: string;
    score: number;
  };
}