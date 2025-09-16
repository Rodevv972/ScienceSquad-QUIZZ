import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import AdminDashboard from './pages/AdminDashboard';
import PlayerManagement from './pages/admin/PlayerManagement';
import GameManagement from './pages/admin/GameManagement';
import StatisticsDashboard from './pages/admin/StatisticsDashboard';
import LeaderboardPage from './pages/LeaderboardPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/lobby" element={<LobbyPage />} />
              <Route path="/game/:gameId" element={<GamePage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/players" element={<PlayerManagement />} />
              <Route path="/admin/games" element={<GameManagement />} />
              <Route path="/admin/statistics" element={<StatisticsDashboard />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
