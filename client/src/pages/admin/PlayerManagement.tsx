import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Ban, RotateCcw, Eye, MessageSquare, 
  Filter, Download, AlertTriangle, ArrowLeft
} from 'lucide-react';
import { AdminPlayer } from '../../types';
import { adminAPI } from '../../utils/api';
import DataTable from '../../components/admin/DataTable';
import ConfirmationModal from '../../components/admin/ConfirmationModal';
import './PlayerManagement.css';

const PlayerManagement: React.FC = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayer | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, [currentPage, statusFilter, searchTerm]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage.toString(),
        limit: '20',
        status: statusFilter,
        search: searchTerm,
        sortBy: 'lastActive',
        sortOrder: 'desc'
      };

      const response = await adminAPI.getPlayers(params);
      setPlayers(response.players);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading players:', error);
      setError('Erreur lors du chargement des joueurs');
    } finally {
      setLoading(false);
    }
  };

  const handleBanPlayer = async (player: AdminPlayer) => {
    setSelectedPlayer(player);
    setConfirmModal({
      isOpen: true,
      title: 'Bannir le joueur',
      message: `Êtes-vous sûr de vouloir bannir ${player.pseudo} ? Cette action peut être annulée plus tard.`,
      type: 'danger',
      action: async () => {
        setIsActionLoading(true);
        try {
          await adminAPI.banPlayer(player.id, 'Comportement inapproprié', 'temporary', 24);
          await loadPlayers();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
          console.error('Error banning player:', error);
          setError('Erreur lors du bannissement du joueur');
        } finally {
          setIsActionLoading(false);
        }
      }
    });
  };

  const handleUnbanPlayer = async (player: AdminPlayer) => {
    setSelectedPlayer(player);
    setConfirmModal({
      isOpen: true,
      title: 'Débannir le joueur',
      message: `Êtes-vous sûr de vouloir débannir ${player.pseudo} ?`,
      type: 'info',
      action: async () => {
        setIsActionLoading(true);
        try {
          await adminAPI.unbanPlayer(player.id);
          await loadPlayers();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
          console.error('Error unbanning player:', error);
          setError('Erreur lors du débannissement du joueur');
        } finally {
          setIsActionLoading(false);
        }
      }
    });
  };

  const handleResetScore = async (player: AdminPlayer) => {
    setSelectedPlayer(player);
    setConfirmModal({
      isOpen: true,
      title: 'Réinitialiser le score',
      message: `Êtes-vous sûr de vouloir réinitialiser le score de ${player.pseudo} ? Cette action est irréversible.`,
      type: 'warning',
      action: async () => {
        setIsActionLoading(true);
        try {
          await adminAPI.resetPlayerScore(player.id);
          await loadPlayers();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
          console.error('Error resetting score:', error);
          setError('Erreur lors de la réinitialisation du score');
        } finally {
          setIsActionLoading(false);
        }
      }
    });
  };

  const handleViewDetails = (player: AdminPlayer) => {
    navigate(`/admin/players/${player.id}`);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('fr-FR');
  };

  const formatScore = (score: number) => {
    return score.toLocaleString('fr-FR');
  };

  const getStatusBadge = (player: AdminPlayer) => {
    if (player.isBanned) {
      return <span className="status-badge banned">Banni</span>;
    }
    if (player.isOnline) {
      return <span className="status-badge online">En ligne</span>;
    }
    return <span className="status-badge offline">Hors ligne</span>;
  };

  const getWarningsBadge = (warnings: number) => {
    if (warnings === 0) return null;
    
    const className = warnings >= 3 ? 'warnings-high' : warnings >= 2 ? 'warnings-medium' : 'warnings-low';
    return (
      <span className={`warnings-badge ${className}`}>
        <AlertTriangle size={12} />
        {warnings}
      </span>
    );
  };

  const columns = [
    {
      key: 'pseudo',
      label: 'Joueur',
      sortable: true,
      render: (value: string, row: AdminPlayer) => (
        <div className="player-cell">
          {row.avatar && <img src={row.avatar} alt="" className="player-avatar" />}
          <div>
            <div className="player-name">{value}</div>
            <div className="player-id">ID: {row.id.slice(-8)}</div>
          </div>
        </div>
      )
    },
    {
      key: 'totalScore',
      label: 'Score total',
      sortable: true,
      render: (value: number) => formatScore(value)
    },
    {
      key: 'gamesPlayed',
      label: 'Parties jouées',
      sortable: true
    },
    {
      key: 'warnings',
      label: 'Avertissements',
      sortable: true,
      render: (value: number) => getWarningsBadge(value) || '0'
    },
    {
      key: 'lastActive',
      label: 'Dernière activité',
      sortable: true,
      render: (value: Date) => formatDate(value)
    },
    {
      key: 'status',
      label: 'Statut',
      render: (_: any, row: AdminPlayer) => getStatusBadge(row)
    }
  ];

  const renderFilters = () => (
    <div className="filters-container">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="filter-select"
      >
        <option value="all">Tous les joueurs</option>
        <option value="online">En ligne</option>
        <option value="offline">Hors ligne</option>
        <option value="banned">Bannis</option>
      </select>
    </div>
  );

  const renderActions = (player: AdminPlayer) => (
    <div className="action-buttons">
      <button
        className="action-btn view"
        onClick={() => handleViewDetails(player)}
        title="Voir les détails"
      >
        <Eye size={16} />
      </button>
      
      {player.isBanned ? (
        <button
          className="action-btn unban"
          onClick={() => handleUnbanPlayer(player)}
          title="Débannir"
        >
          <RotateCcw size={16} />
        </button>
      ) : (
        <button
          className="action-btn ban"
          onClick={() => handleBanPlayer(player)}
          title="Bannir"
        >
          <Ban size={16} />
        </button>
      )}
      
      <button
        className="action-btn reset"
        onClick={() => handleResetScore(player)}
        title="Réinitialiser le score"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );

  return (
    <div className="player-management">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/admin')}>
          <ArrowLeft size={20} />
          Retour au dashboard
        </button>
        
        <div className="header-content">
          <div className="header-info">
            <div className="header-icon">
              <Users size={24} />
            </div>
            <div>
              <h1>Gestion des Joueurs</h1>
              <p>{total} joueur{total > 1 ? 's' : ''} au total</p>
            </div>
          </div>
          
          <div className="header-actions">
            <button className="btn btn-secondary">
              <Download size={16} />
              Exporter
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
          data={players}
          columns={columns}
          loading={loading}
          searchable
          searchPlaceholder="Rechercher un joueur..."
          filters={renderFilters()}
          actions={renderActions}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage
          }}
          emptyMessage="Aucun joueur trouvé"
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

export default PlayerManagement;