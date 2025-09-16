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

// Extended admin types
export interface AdminPlayer extends Player {
  isBanned: boolean;
  banExpiresAt?: Date;
  warnings: number;
  gameHistory: GameHistoryEntry[];
  statistics: PlayerStatistics;
  lastActive: Date;
  createdAt: Date;
}

export interface GameHistoryEntry {
  gameId: string;
  date: Date;
  score: number;
  position: number;
  questionsAnswered: number;
  correctAnswers: number;
}

export interface PlayerStatistics {
  averageScore: number;
  bestScore: number;
  totalCorrectAnswers: number;
  totalQuestionsAnswered: number;
  averageAnswerTime: number;
  favoriteCategory?: string;
}

export interface AdminQuestion {
  _id: string;
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  subcategory: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  tags: string[];
  createdBy: string;
  isActive: boolean;
  usage: QuestionUsage;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionUsage {
  timesUsed: number;
  correctAnswerRate: number;
  averageAnswerTime: number;
  lastUsed?: Date;
}

export interface AdminGame extends Game {
  settings: GameSettings;
  statistics: GameStatistics;
  endedAt?: Date;
  endReason: 'completed' | 'admin_ended' | 'timeout' | 'error';
  playerCount: number;
}

export interface GameSettings {
  questionCount: number;
  timePerQuestion: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  categories: string[];
  isPrivate: boolean;
}

export interface GameStatistics {
  totalQuestions: number;
  averageScore: number;
  highestScore: number;
  participationRate: number;
}

export interface AdminUser {
  _id: string;
  username: string;
  role: 'admin' | 'super_admin' | 'moderator';
  permissions: AdminPermissions;
  isActive: boolean;
  lastLogin?: Date;
  createdBy?: string;
  actionCount: number;
  lastActionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPermissions {
  manageGames: boolean;
  managePlayers: boolean;
  manageQuestions: boolean;
  manageAdmins: boolean;
  viewStatistics: boolean;
  systemMaintenance: boolean;
}

export interface AdminLog {
  _id: string;
  adminUsername: string;
  action: string;
  targetType: 'player' | 'game' | 'question' | 'admin' | 'system';
  targetId?: string;
  targetName?: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Notification {
  _id: string;
  type: 'personal' | 'global' | 'warning' | 'info' | 'alert';
  title: string;
  message: string;
  sender: string;
  recipients?: NotificationRecipient[];
  isGlobal: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRecipient {
  playerId: string;
  pseudo: string;
  isRead: boolean;
  readAt?: Date;
}

export interface SecurityAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  playerId?: string;
  playerName?: string;
  createdAt: Date;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'error';
  database: DatabaseStatus;
  memory: MemoryStatus;
  uptime: number;
  recentErrors: number;
  timestamp: Date;
}

export interface DatabaseStatus {
  connected: boolean;
  state: number;
  host: string;
  name: string;
}

export interface MemoryStatus {
  used: number;
  total: number;
  percentage: number;
}

export interface AdminDashboardStats {
  totalPlayers: number;
  onlinePlayers: number;
  totalGames: number;
  activeGames: number;
  totalQuestions: number;
  recentActions: AdminLog[];
}