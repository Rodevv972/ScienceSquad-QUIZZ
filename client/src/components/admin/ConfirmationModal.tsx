import React from 'react';
import { X, AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle size={24} />;
      case 'warning':
        return <AlertCircle size={24} />;
      case 'info':
        return <Info size={24} />;
      case 'success':
        return <CheckCircle size={24} />;
      default:
        return <AlertCircle size={24} />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'btn-danger';
      case 'warning':
        return 'btn-warning';
      case 'info':
        return 'btn-primary';
      case 'success':
        return 'btn-success';
      default:
        return 'btn-primary';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className={`modal-icon modal-icon-${type}`}>
            {getIcon()}
          </div>
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} disabled={isLoading}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            className={`btn ${getButtonClass()}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Traitement...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;