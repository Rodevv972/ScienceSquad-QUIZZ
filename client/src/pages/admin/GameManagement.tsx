import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Gamepad2, Square, Settings, Trash2, 
  ArrowLeft, Clock, Users, AlertTriangle 
} from 'lucide-react';
import { AdminGame } from '../../types';
import { adminAPI } from '../../utils/api';
import DataTable from '../../components/admin/DataTable';
import ConfirmationModal from '../../components/admin/ConfirmationModal';
import './GameManagement.css';

const GameManagement: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<AdminGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {}
  });
  
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage.toString(),
        limit: '20',
        status: statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const response = await adminAPI.getGames(params);
      setGames(response.games);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading games:', error);
      setError('Erreur lors du chargement des parties');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleDeleteGame = async (game: AdminGame) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer la partie',
      message: `Êtes-vous sûr de vouloir supprimer la partie ${game.gameId} ? Cette action est irréversible.`,
      type: 'danger',
      action: async () => {
        if (game.status === 'active') {
          setError('Impossible de supprimer une partie en cours');
          return;
        }
        
        setIsActionLoading(true);
        try {
          await adminAPI.deleteGame(game.gameId);
          await loadGames();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
          console.error('Error deleting game:', error);
          setError('Erreur lors de la suppression de la partie');
        } finally {
          setIsActionLoading(false);
        }
      }
    });
  };

  const handleEndGame = async (game: AdminGame) => {
    setConfirmModal({
      isOpen: true,
      title: 'Terminer la partie',
      message: `Êtes-vous sûr de vouloir terminer la partie ${game.gameId} ?`,
      type: 'warning',
      action: async () => {
        setIsActionLoading(true);
        try {
          await adminAPI.endGame(game.gameId);
          await loadGames();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
          console.error('Error ending game:', error);
          setError('Erreur lors de la fin de partie');
        } finally {
          setIsActionLoading(false);
        }
      }
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('fr-FR');
  };

  const formatDuration = (start: Date, end?: Date) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;
    const minutes = Math.floor(duration / 60000);
    return `${minutes} min`;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      waiting: <span className="status-badge waiting">En attente</span>,
      active: <span className="status-badge active">En cours</span>,
      finished: <span className="status-badge finished">Terminée</span>
    };
    return badges[status as keyof typeof badges] || <span className="status-badge unknown">Inconnu</span>;
  };

  const columns = [
    {
      key: 'gameId',
      label: 'ID Partie',
      sortable: true,
      render: (value: string) => (
        <div className="game-id">
          <span className="id-text">{value}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'createdBy',
      label: 'Créé par',
      sortable: true
    },
    {
      key: 'playerCount',
      label: 'Joueurs',
      sortable: true,
      render: (value: number) => (
        <div className="player-count">
          <Users size={14} />
          {value}
        </div>
      )
    },
    {
      key: 'currentQuestion',
      label: 'Questions',
      render: (value: number, row: AdminGame) => (
        <div className="question-progress">
          {value || 0} / {row.settings?.questionCount || '?'}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Créé le',
      sortable: true,
      render: (value: Date) => formatDate(value)
    },
    {
      key: 'duration',
      label: 'Durée',
      render: (_: any, row: AdminGame) => formatDuration(row.createdAt!, row.endedAt)
    }
  ];

  const renderFilters = () => (
    <div className="filters-container">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="filter-select"
      >
        <option value="all">Toutes les parties</option>
        <option value="waiting">En attente</option>
        <option value="active">En cours</option>
        <option value="finished">Terminées</option>
      </select>
    </div>
  );

  const renderActions = (game: AdminGame) => (
    <div className="action-buttons">
      <button
        className="action-btn view"
        onClick={() => navigate(`/admin/games/${game.gameId}`)}
        title="Voir les détails"
      >
        <Settings size={16} />
      </button>
      
      {game.status === 'active' && (
        <button
          className="action-btn end"
          onClick={() => handleEndGame(game)}
          title="Terminer la partie"
        >
          <Square size={16} />
        </button>
      )}
      
      {(game.status === 'waiting' || game.status === 'finished') && (
        <button
          className="action-btn delete"
          onClick={() => handleDeleteGame(game)}
          title="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="game-management">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/admin')}>
          <ArrowLeft size={20} />
          Retour au dashboard
        </button>
        
        <div className="header-content">
          <div className="header-info">
            <div className="header-icon">
              <Gamepad2 size={24} />
            </div>
            <div>
              <h1>Gestion des Parties</h1>
              <p>{total} partie{total > 1 ? 's' : ''} au total</p>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/admin/games/history')}
            >
              <Clock size={16} />
              Historique détaillé
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className="content-card">
        <DataTable
          data={games}
          columns={columns}
          loading={loading}
          searchable
          searchPlaceholder="Rechercher une partie..."
          filters={renderFilters()}
          actions={renderActions}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage
          }}
          emptyMessage="Aucune partie trouvée"
        />
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default GameManagement;