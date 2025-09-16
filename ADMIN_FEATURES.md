# ScienceSquad Quiz - Advanced Admin Features

## 📋 Vue d'Ensemble

Cette mise à jour majeure ajoute un système d'administration avancé complet pour la plateforme ScienceSquad Quiz, offrant aux administrateurs des outils puissants pour gérer les joueurs, les parties, les questions, et surveiller l'activité du système en temps réel.

## 🚀 Nouvelles Fonctionnalités Administrateur

### 1. **Gestion des Joueurs**
- **Bannissement/Débannissement** : Bannir temporairement ou définitivement des joueurs
- **Réinitialisation des scores** : Réinitialiser les scores individuels des joueurs
- **Historique détaillé** : Visualiser l'historique de jeu complet de chaque joueur
- **Système d'avertissements** : Gérer les avertissements et identifier les comportements suspects
- **Filtrage avancé** : Rechercher et filtrer les joueurs par statut, score, date d'inscription

### 2. **Gestion des Parties**
- **Contrôle en temps réel** : Terminer, modifier ou supprimer des parties
- **Historique détaillé** : Analyser toutes les parties avec statistiques complètes
- **Modification des paramètres** : Ajuster le nombre de questions, temps, difficulté
- **Surveillance active** : Voir les parties en cours avec détails des participants

### 3. **Gestion des Questions**
- **CRUD complet** : Créer, modifier, supprimer des questions
- **Système de catégories** : Organiser les questions par thèmes et sous-catégories
- **Import/Export** : Importer en masse via CSV/Excel, exporter les questions
- **Statistiques d'utilisation** : Analyser la performance et difficulté des questions
- **Tags et métadonnées** : Système de tags pour une meilleure organisation

### 4. **Statistiques & Monitoring**
- **Dashboard temps réel** : Surveillance live de l'activité serveur
- **Graphiques interactifs** : Évolution des joueurs, parties, scores
- **Métriques système** : Utilisation mémoire, uptime, performance
- **Activité en direct** : Parties actives, joueurs en ligne, parties récentes

### 5. **Gestion des Administrateurs**
- **Système de rôles** : Admin, Super Admin, Modérateur avec permissions spécifiques
- **Gestion des permissions** : Contrôle granulaire des accès aux fonctionnalités
- **Logs d'actions** : Historique complet de toutes les actions administrateur
- **Authentification sécurisée** : Système de tokens JWT avec vérification de rôles

### 6. **Sécurité & Modération**
- **Détection automatique** : Identification des comportements suspects (réponses trop rapides, scores anormaux)
- **Système d'alertes** : Notifications en temps réel des activités suspectes
- **Mode maintenance** : Basculer le serveur en mode maintenance
- **Surveillance des IP** : Détection de comptes multiples (préparé pour implémentation)

### 7. **Notifications & Communication**
- **Annonces globales** : Diffuser des messages à tous les joueurs
- **Messages personnels** : Envoyer des notifications ciblées
- **Système de priorités** : Messages urgents, normaux, informatifs
- **Centre de notifications** : Interface unifiée pour gérer tous les messages

### 8. **Export & Sauvegarde**
- **Export des données** : Exporter joueurs, parties, questions en différents formats
- **Statistiques complètes** : Rapports détaillés sur l'utilisation de la plateforme
- **API complète** : Endpoints RESTful pour toutes les fonctionnalités admin

## 🛠️ Architecture Technique

### Backend (Node.js/Express/MongoDB)

#### Nouveaux Modèles de Données

**Ban** - Gestion des bannissements
```javascript
{
  playerId: ObjectId,
  pseudo: String,
  reason: String,
  bannedBy: String,
  banType: 'temporary' | 'permanent',
  expiresAt: Date,
  isActive: Boolean
}
```

**AdminLog** - Logs d'actions administrateur
```javascript
{
  adminUsername: String,
  action: String,
  targetType: 'player' | 'game' | 'question' | 'admin' | 'system',
  targetId: String,
  targetName: String,
  details: Mixed,
  ipAddress: String,
  userAgent: String
}
```

**Notification** - Système de notifications
```javascript
{
  type: 'personal' | 'global' | 'warning' | 'info' | 'alert',
  title: String,
  message: String,
  sender: String,
  recipients: [{ playerId, pseudo, isRead, readAt }],
  isGlobal: Boolean,
  priority: 'low' | 'normal' | 'high' | 'urgent'
}
```

**Question** - Questions enrichies
```javascript
{
  question: String,
  choices: [String],
  correctAnswer: Number,
  explanation: String,
  category: String,
  subcategory: String,
  difficulty: 'easy' | 'medium' | 'hard',
  timeLimit: Number,
  tags: [String],
  createdBy: String,
  usage: {
    timesUsed: Number,
    correctAnswerRate: Number,
    averageAnswerTime: Number,
    lastUsed: Date
  }
}
```

#### API Routes Administrateur

- `/api/admin/players` - Gestion des joueurs
- `/api/admin/games` - Gestion des parties  
- `/api/admin/questions` - Gestion des questions
- `/api/admin/statistics` - Statistiques et monitoring
- `/api/admin/admins` - Gestion des administrateurs
- `/api/admin/notifications` - Système de notifications
- `/api/admin/security` - Sécurité et alertes

#### Middleware de Sécurité

- **Authentification JWT** : Vérification des tokens administrateur
- **Contrôle des permissions** : Vérification granulaire des droits d'accès
- **Logging automatique** : Enregistrement de toutes les actions admin

#### Services Spécialisés

- **GameManager étendu** : Actions admin, détection de triche, statistiques
- **SecurityService** : Monitoring, alertes, détection d'anomalies
- **NotificationService** : Gestion des messages et annonces

### Frontend (React/TypeScript)

#### Nouvelles Pages Administrateur

1. **Dashboard Admin Enrichi** (`/admin`)
   - Vue d'ensemble avec navigation vers toutes les sections
   - Statistiques en temps réel
   - Actions rapides

2. **Gestion des Joueurs** (`/admin/players`)
   - Table avec recherche, filtres, pagination
   - Actions : bannir, débannir, réinitialiser score
   - Détails complets de chaque joueur

3. **Gestion des Parties** (`/admin/games`)
   - Liste des parties avec statuts
   - Actions : modifier, terminer, supprimer
   - Historique détaillé

4. **Gestion des Questions** (`/admin/questions`)
   - CRUD complet des questions
   - Import/export CSV
   - Statistiques d'utilisation

5. **Statistiques Avancées** (`/admin/statistics`)
   - Graphiques interactifs
   - Monitoring temps réel
   - Métriques système

#### Composants Réutilisables

- **DataTable** : Table avec tri, recherche, filtres, pagination
- **ConfirmationModal** : Modales de confirmation pour actions critiques
- **StatisticsChart** : Graphiques et visualisations de données
- **NotificationCenter** : Centre de gestion des notifications

#### Types TypeScript Étendus

Types complets pour toutes les entités admin avec interfaces strictes pour la sécurité des données.

## 🔧 Installation et Configuration

### Prérequis
- Node.js 16+ 
- MongoDB 4.4+
- npm ou yarn

### Installation des Dépendances

```bash
# Dépendances backend
cd server
npm install csvtojson  # Pour l'import CSV des questions

# Dépendances frontend (déjà installées)
cd ../client
npm install
```

### Variables d'Environnement

Ajouter au fichier `server/.env` :
```env
JWT_SECRET=your_super_secret_jwt_key
MONGODB_URI=mongodb://localhost:27017/sciencequiz
CLIENT_URL=http://localhost:3000
```

### Création du Premier Super Admin

```javascript
// Script de création du premier admin
const Admin = require('./models/Admin');

const createSuperAdmin = async () => {
  const admin = new Admin({
    username: 'superadmin',
    password: 'changeme123', // Sera hashé automatiquement
    role: 'super_admin',
    permissions: {
      manageGames: true,
      managePlayers: true,
      manageQuestions: true,
      manageAdmins: true,
      viewStatistics: true,
      systemMaintenance: true
    }
  });
  
  await admin.save();
  console.log('Super admin créé avec succès');
};
```

## 🚀 Utilisation

### Connexion Administrateur

1. Aller sur `/admin/login`
2. Se connecter avec les identifiants admin
3. Accéder au dashboard admin enrichi

### Fonctionnalités Principales

#### Gestion des Joueurs
- Bannir un joueur : `POST /api/admin/players/:id/ban`
- Réinitialiser score : `POST /api/admin/players/:id/reset-score`
- Voir l'historique : `GET /api/admin/players/:id`

#### Gestion des Parties
- Terminer une partie : `POST /api/admin/games/:id/end`
- Modifier paramètres : `PUT /api/admin/games/:id/settings`
- Supprimer : `DELETE /api/admin/games/:id`

#### Monitoring Temps Réel
- Activité serveur : `GET /api/admin/statistics/activity/realtime`
- Santé système : `GET /api/admin/security/health`
- Alertes sécurité : `GET /api/admin/security/alerts`

## 🔒 Sécurité

### Système de Permissions

- **Super Admin** : Accès complet à toutes les fonctionnalités
- **Admin** : Accès aux fonctions de base (joueurs, parties, questions)
- **Modérateur** : Accès limité (lecture seule + actions de modération)

### Audit et Logs

Toutes les actions administrateur sont enregistrées avec :
- Horodatage précis
- Identifiant de l'admin
- Action effectuée
- Cible de l'action
- Détails de l'action
- Adresse IP (si disponible)

### Détection d'Anomalies

Le système surveille automatiquement :
- Réponses anormalement rapides
- Scores suspects
- Taux de réussite irréalistes
- Activité de comptes multiples

## 📊 Monitoring et Alertes

### Métriques Surveillées

- **Performance** : Utilisation mémoire, CPU, temps de réponse
- **Activité** : Joueurs connectés, parties actives, questions posées
- **Sécurité** : Tentatives de connexion, actions suspectes
- **Erreurs** : Logs d'erreurs, pannes système

### Types d'Alertes

1. **Sécurité** : Comportements suspects détectés
2. **Performance** : Surcharge système, mémoire élevée
3. **Erreurs** : Erreurs critiques, pannes de service
4. **Maintenance** : Mises à jour requises, maintenance programmée

## 🔄 API Endpoints Administrateur

### Authentification
- `POST /api/auth/admin/login` - Connexion admin

### Gestion des Joueurs
- `GET /api/admin/players` - Liste des joueurs
- `GET /api/admin/players/:id` - Détails joueur
- `POST /api/admin/players/:id/ban` - Bannir joueur
- `POST /api/admin/players/:id/unban` - Débannir joueur
- `POST /api/admin/players/:id/reset-score` - Réinitialiser score

### Gestion des Parties
- `GET /api/admin/games` - Liste des parties
- `GET /api/admin/games/:id` - Détails partie
- `DELETE /api/admin/games/:id` - Supprimer partie
- `PUT /api/admin/games/:id/settings` - Modifier paramètres
- `POST /api/admin/games/:id/end` - Terminer partie

### Gestion des Questions
- `GET /api/admin/questions` - Liste des questions
- `POST /api/admin/questions` - Créer question
- `PUT /api/admin/questions/:id` - Modifier question
- `DELETE /api/admin/questions/:id` - Supprimer question
- `POST /api/admin/questions/import` - Importer CSV
- `GET /api/admin/questions/export` - Exporter questions

### Statistiques
- `GET /api/admin/statistics/dashboard` - Stats dashboard
- `GET /api/admin/statistics/players/timeline` - Évolution joueurs
- `GET /api/admin/statistics/games/stats` - Stats parties
- `GET /api/admin/statistics/activity/realtime` - Activité temps réel

### Notifications
- `GET /api/admin/notifications` - Liste notifications
- `POST /api/admin/notifications/global` - Annonce globale
- `POST /api/admin/notifications/personal` - Message personnel

### Sécurité
- `GET /api/admin/security/alerts` - Alertes sécurité
- `GET /api/admin/security/health` - Santé système
- `POST /api/admin/security/maintenance` - Mode maintenance

## 🎯 Prochaines Étapes

### Fonctionnalités Prévues

1. **Analytics Avancées** : Graphiques interactifs avec Chart.js
2. **Système de Rapports** : Génération automatique de rapports périodiques
3. **API Publique** : Endpoints pour intégrations tierces
4. **Mobile Admin App** : Application mobile pour administration
5. **IA & Machine Learning** : Détection automatique de triche améliorée

### Améliorations Techniques

1. **Cache Redis** : Amélioration des performances
2. **Microservices** : Architecture distribuée
3. **Kubernetes** : Déploiement containerisé
4. **Monitoring Avancé** : Prometheus + Grafana
5. **Tests Automatisés** : Suite de tests complète

---

## 🤝 Contribution

Pour contribuer au développement des fonctionnalités administrateur :

1. Fork du repository
2. Créer une branche feature
3. Développer et tester
4. Créer une Pull Request

---

## 📞 Support

Pour toute question ou assistance technique :
- Créer une issue GitHub
- Consulter la documentation API
- Contacter l'équipe de développement

---

**ScienceSquad Quiz - Plateforme de Quiz Éducatif Avancée**  
*Développé avec ❤️ pour l'éducation interactive*