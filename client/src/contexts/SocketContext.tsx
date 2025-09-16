import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketContextType } from '../types';

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Créer la connexion Socket.io
    const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
    const newSocket = io(serverUrl, {
      autoConnect: false,
    });

    // Gestionnaires d'événements
    newSocket.on('connect', () => {
      console.log('✅ Connecté au serveur');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Déconnecté du serveur');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Nettoyage lors du démontage
    return () => {
      newSocket.close();
    };
  }, []);

  // Auto-connexion/déconnexion basée sur l'authentification
  useEffect(() => {
    const token = localStorage.getItem('quiz_token');
    
    if (token && socket && !socket.connected) {
      socket.connect();
    } else if (!token && socket && socket.connected) {
      socket.disconnect();
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};