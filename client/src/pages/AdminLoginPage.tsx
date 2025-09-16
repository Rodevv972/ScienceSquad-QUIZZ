import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import { Shield, ArrowLeft, LogIn } from 'lucide-react';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.adminLogin(formData.username.trim(), formData.password);
      
      if (response.success) {
        login(response.admin, response.token, 'admin');
        navigate('/admin/dashboard');
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
        <div className="admin-login-card fade-in">
          <div className="login-header">
            <Link to="/" className="back-link">
              <ArrowLeft size={20} />
              Retour
            </Link>
            <h1 className="admin-login-title">
              <Shield size={28} />
              Accès Administrateur
              <span className="admin-badge">Admin</span>
            </h1>
            <p className="login-subtitle">
              Connectez-vous pour gérer les quiz
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Votre nom d'utilisateur"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Votre mot de passe"
                required
              />
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
                  <LogIn size={20} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <div className="admin-info">
              <h4>Informations de connexion par défaut :</h4>
              <p><strong>Nom d'utilisateur :</strong> admin</p>
              <p><strong>Mot de passe :</strong> admin123</p>
            </div>
            <p>
              Vous êtes joueur ?{' '}
              <Link to="/login" className="login-link">
                Connexion Joueur
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;