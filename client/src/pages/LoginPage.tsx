import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import { Upload, User, ArrowLeft, Camera } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    pseudo: '',
    avatar: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Avatars prédéfinis
  const predefinedAvatars = [
    '🧑‍🔬', '👩‍🔬', '👨‍🔬', '🧑‍🎓', '👩‍🎓', '👨‍🎓',
    '🤓', '😎', '🧐', '🤔', '😊', '🙂', '😄', '🤗', '🥳', '🚀'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleAvatarSelect = (avatar: string) => {
    setFormData(prev => ({
      ...prev,
      avatar
    }));
    setAvatarFile(null);
    setAvatarPreview('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La taille du fichier ne doit pas dépasser 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner une image');
        return;
      }

      setAvatarFile(file);
      setFormData(prev => ({ ...prev, avatar: '' }));
      
      // Créer une prévisualisation
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pseudo.trim()) {
      setError('Veuillez entrer un pseudo');
      return;
    }

    if (formData.pseudo.trim().length < 2 || formData.pseudo.trim().length > 20) {
      setError('Le pseudo doit contenir entre 2 et 20 caractères');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let avatarUrl = formData.avatar;
      
      // Upload de l'avatar personnalisé si présent
      if (avatarFile) {
        const uploadResponse = await authAPI.uploadAvatar(avatarFile);
        avatarUrl = uploadResponse.avatarUrl;
      }

      // Connexion du joueur
      const response = await authAPI.playerLogin(formData.pseudo.trim(), avatarUrl);
      
      if (response.success) {
        login(response.player, response.token, 'player');
        navigate('/lobby');
      } else {
        setError(response.message || 'Erreur lors de la connexion');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="login-card fade-in">
          <div className="login-header">
            <Link to="/" className="back-link">
              <ArrowLeft size={20} />
              Retour
            </Link>
            <h1 className="login-title">
              <User size={28} />
              Connexion Joueur
            </h1>
            <p className="login-subtitle">
              Créez votre profil pour rejoindre le quiz
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="pseudo" className="form-label">
                Pseudo *
              </label>
              <input
                type="text"
                id="pseudo"
                name="pseudo"
                value={formData.pseudo}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Votre pseudo (2-20 caractères)"
                maxLength={20}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Avatar
              </label>
              
              {/* Aperçu de l'avatar sélectionné */}
              <div className="avatar-preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="avatar-image" />
                ) : formData.avatar ? (
                  <div className="avatar-emoji">{formData.avatar}</div>
                ) : (
                  <div className="avatar-placeholder">
                    <User size={32} />
                  </div>
                )}
              </div>

              {/* Avatars prédéfinis */}
              <div className="predefined-avatars">
                <h4>Avatars prédéfinis :</h4>
                <div className="avatar-grid">
                  {predefinedAvatars.map((avatar, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`avatar-option ${formData.avatar === avatar ? 'selected' : ''}`}
                      onClick={() => handleAvatarSelect(avatar)}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload d'avatar personnalisé */}
              <div className="custom-avatar">
                <h4>Ou uploadez votre propre avatar :</h4>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={16} />
                  Choisir une image
                </button>
                <small className="upload-info">
                  Formats acceptés: JPG, PNG, GIF (max 5MB)
                </small>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Connexion...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Rejoindre le Quiz
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Vous êtes administrateur ?{' '}
              <Link to="/admin/login" className="login-link">
                Connexion Admin
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;