import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, Player, Admin } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Player | Admin | null>(null);
  const [userType, setUserType] = useState<'player' | 'admin' | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Récupérer les données de session du localStorage
    const savedToken = localStorage.getItem('quiz_token');
    const savedUser = localStorage.getItem('quiz_user');
    const savedUserType = localStorage.getItem('quiz_user_type');

    if (savedToken && savedUser && savedUserType) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        setUserType(savedUserType as 'player' | 'admin');
      } catch (error) {
        console.error('Erreur lors de la récupération de la session:', error);
        logout();
      }
    }
  }, []);

  const login = (userData: Player | Admin, userToken: string, type: 'player' | 'admin') => {
    setUser(userData);
    setUserType(type);
    setToken(userToken);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('quiz_token', userToken);
    localStorage.setItem('quiz_user', JSON.stringify(userData));
    localStorage.setItem('quiz_user_type', type);
  };

  const logout = () => {
    setUser(null);
    setUserType(null);
    setToken(null);
    
    // Nettoyer localStorage
    localStorage.removeItem('quiz_token');
    localStorage.removeItem('quiz_user');
    localStorage.removeItem('quiz_user_type');
  };

  const isAuthenticated = Boolean(user && token);

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        token,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};