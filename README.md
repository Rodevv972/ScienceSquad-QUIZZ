# ScienceSquad Quiz - Plateforme de Quiz Live

Une plateforme de quiz en temps réel avec interface moderne et support multijoueurs.

## 🚀 Fonctionnalités

### Joueurs
- **Connexion simple** : Pseudo + avatar (prédéfini ou upload personnalisé)
- **Lobby en temps réel** : Voir les joueurs connectés et les parties disponibles
- **Quiz interactifs** : Questions générées par l'IA avec timer de 15 secondes
- **Classements** : Scores intermédiaires et leaderboard global
- **Interface responsive** : Optimisée pour streaming (TikTok/Twitch)

### Administrateurs
- **Gestion des parties** : Création et lancement de quiz
- **Contrôle en temps réel** : Passage manuel aux questions suivantes
- **Modération** : Gestion des joueurs connectés
- **Questions IA** : Génération automatique via l'API Perplexity

## 📋 Prérequis

- **Node.js** (version 16 ou supérieure)
- **MongoDB** (version 4.4 ou supérieure)
- **NPM** ou **Yarn**

## ⚡ Installation Rapide

### 1. Cloner le projet
```bash
git clone https://github.com/Rodevv972/ScienceSquad-QUIZZ.git
cd ScienceSquad-QUIZZ
```

### 2. Installer les dépendances
```bash
npm run install:all
```

### 3. Configuration de la base de données

#### Option A: MongoDB local
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mongodb

# macOS (avec Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Windows
# Télécharger depuis https://www.mongodb.com/try/download/community
```

#### Option B: MongoDB Atlas (Cloud)
1. Créer un compte sur [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Créer un cluster gratuit
3. Obtenir l'URI de connexion

### 4. Configuration des variables d'environnement

Copier le fichier d'exemple :
```bash
cp server/.env.example server/.env
```

Modifier `server/.env` avec vos paramètres :
```env
# Configuration de la base de données
MONGODB_URI=mongodb://localhost:27017/sciencequiz
# ou pour MongoDB Atlas :
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sciencequiz

# Configuration du serveur
PORT=5000
CLIENT_URL=http://localhost:3000

# Clé API Perplexity (déjà configurée)
PERPLEXITY_API_KEY=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

# Configuration JWT
JWT_SECRET=votre_cle_secrete_jwt_super_securisee

# Configuration Admin par défaut
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
```

### 5. Démarrer l'application

#### Mode développement (recommandé)
```bash
npm run dev
```
Cette commande démarre automatiquement :
- Le serveur backend sur http://localhost:5000
- Le client React sur http://localhost:3000

#### Mode production
```bash
# Build du client
npm run build

# Démarrage du serveur
npm start
```

## 🎮 Guide d'utilisation

### Accès Administrateur
1. Aller sur http://localhost:3000/admin/login
2. Utiliser les identifiants par défaut :
   - **Nom d'utilisateur** : `admin`
   - **Mot de passe** : `admin123`

### Connexion Joueur
1. Aller sur http://localhost:3000/login
2. Choisir un pseudo (2-20 caractères)
3. Sélectionner un avatar ou en uploader un
4. Rejoindre le lobby

### Lancer une partie
1. **Administrateur** : Créer et lancer une partie depuis le dashboard
2. **Joueurs** : Rejoindre la partie depuis le lobby
3. **Quiz** : Répondre aux questions générées automatiquement
4. **Résultats** : Voir les scores et classements en temps réel

## 🛠️ Structure du projet

```
ScienceSquad-QUIZZ/
├── client/                 # Application React (Frontend)
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── contexts/       # Contextes React (Auth, Socket)
│   │   ├── pages/         # Pages principales
│   │   ├── types/         # Types TypeScript
│   │   └── utils/         # Utilitaires et API
│   └── package.json
├── server/                # Serveur Express (Backend)
│   ├── models/           # Modèles MongoDB
│   ├── routes/           # Routes API
│   ├── services/         # Services (GameManager, Perplexity)
│   ├── middleware/       # Middlewares Express
│   └── package.json
└── package.json          # Scripts de coordination
```

## 🔧 Configuration avancée

### Variables d'environnement

#### Serveur (`server/.env`)
- `MONGODB_URI` : URI de connexion MongoDB
- `PORT` : Port du serveur (défaut: 5000)
- `CLIENT_URL` : URL du client pour CORS
- `PERPLEXITY_API_KEY` : Clé API Perplexity pour génération de questions
- `JWT_SECRET` : Clé secrète pour JWT
- `DEFAULT_ADMIN_USERNAME` : Nom d'utilisateur admin par défaut
- `DEFAULT_ADMIN_PASSWORD` : Mot de passe admin par défaut

#### Client (`client/.env`)
- `REACT_APP_API_URL` : URL de l'API backend
- `REACT_APP_SERVER_URL` : URL du serveur Socket.io

### Personnalisation des questions

Les questions sont générées automatiquement par l'API Perplexity. Pour personnaliser :

1. Modifier `server/services/PerplexityService.js`
2. Adapter le prompt de génération selon vos besoins
3. Ajouter des questions de secours dans `getFallbackQuestion()`

## 🚀 Déploiement

### Option 1: Heroku
```bash
# Créer une app Heroku
heroku create sciencequad-quiz

# Configurer les variables d'environnement
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set PERPLEXITY_API_KEY=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
heroku config:set JWT_SECRET=your_jwt_secret

# Déployer
git push heroku main
```

### Option 2: VPS/Docker
```bash
# Build l'image
docker build -t sciencequad-quiz .

# Lancer avec docker-compose
docker-compose up -d
```

### Option 3: Vercel + MongoDB Atlas
1. Connecter le repository à Vercel
2. Configurer les variables d'environnement
3. Déployer automatiquement

## 🔒 Sécurité

- Authentification JWT pour toutes les routes protégées
- Hashage des mots de passe administrateur avec bcrypt
- Validation des données d'entrée
- Protection CORS configurée
- Upload de fichiers sécurisé avec limitations

## 🤝 Contribution

1. Forker le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commiter les changements (`git commit -m 'Add some AmazingFeature'`)
4. Pusher vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

En cas de problème :
1. Vérifier que MongoDB est démarré
2. Vérifier les variables d'environnement
3. Consulter les logs du serveur
4. Ouvrir une issue sur GitHub

## 🎯 Roadmap

- [ ] Mode tournoi
- [ ] Themes de questions personnalisés
- [ ] Intégration Twitch/YouTube pour streaming
- [ ] Application mobile
- [ ] Mode hors ligne
- [ ] Statistiques avancées

---

Créé avec ❤️ par l'équipe ScienceSquad
