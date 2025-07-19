# 🚀 ScienceSquad-QUIZZ

**Le Grand Maître du Quizz** - Application de quiz scientifique en temps réel avec génération intelligente de questions via GPT

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

## 📖 Description

ScienceSquad-QUIZZ est une application web interactive qui permet de créer et jouer à des quiz scientifiques en temps réel. L'application utilise l'API OpenAI GPT pour générer automatiquement des questions personnalisées selon le domaine scientifique et le niveau de difficulté choisis.

### ✨ Fonctionnalités principales

- 🤖 **Génération IA** : Questions générées automatiquement via OpenAI GPT
- 🔬 **Domaines scientifiques** : Physique, Chimie, Biologie, Mathématiques, Astronomie, Informatique, et plus
- 👥 **Multijoueur** : Jusqu'à 50 joueurs simultanés
- ⚡ **Temps réel** : Interface synchronisée via WebSocket
- 🎯 **Niveaux adaptatifs** : Facile, Moyen, Difficile, ou Progressif
- 🎨 **Interface moderne** : Design responsive et avatars personnalisables
- 🔧 **Administration** : Interface dédiée pour la gestion des quiz

## 🛠️ Technologies utilisées

- **Backend** : Node.js + Express
- **WebSocket** : Socket.io pour la communication temps réel
- **IA** : API OpenAI (GPT-3.5-turbo/GPT-4)
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Gestion d'état** : Socket.io avec persistance locale

## 📋 Prérequis

- Node.js (≥ 16.0.0)
- npm (≥ 8.0.0)
- Clé API OpenAI valide

## 🚀 Installation

1. **Cloner le repository**
```bash
git clone https://github.com/Rodevv972/ScienceSquad-QUIZZ.git
cd ScienceSquad-QUIZZ
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de l'environnement**
```bash
# Créer un fichier .env à la racine
touch .env
```

Ajouter votre clé API OpenAI dans le fichier `.env` :
```env
OPENAI_API_KEY=sk-votre_cle_api_openai_ici
```

4. **Démarrer l'application**
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

L'application sera accessible sur `http://localhost:3000`

## 🎮 Utilisation

### Pour les joueurs
1. Accédez à `http://localhost:3000`
2. Entrez votre pseudo et choisissez un avatar
3. Rejoignez le lobby et attendez le début du quiz
4. Répondez aux questions dans le temps imparti

### Pour les administrateurs
1. Accédez à `http://localhost:3000/admin`
2. Configurez les paramètres du quiz :
   - Sujet scientifique (ou domaine personnalisé)
   - Nombre de questions (1-30)
   - Niveau de difficulté
3. Lancez la génération et démarrez le quiz
4. Surveillez les statistiques en temps réel

## 📁 Structure du projet

.
├── controllers
│   ├── leaderboardController.js
│   └── statsController.js
├── models
│   ├── Game.js
│   └── User.js
├── package.json
├── package-lock.json
├── public
│   ├── admin.html
│   ├── admin.js
│   ├── index.html
│   ├── script.js
│   └── style.css
├── README.md
├── routes
│   ├── leaderboard.js
│   └── liveStats.js
├── server
│   └── src
│       └── services
│           └── triviaService.js
└── server.js

## 🔧 Configuration

### Variables d'environnement
- `OPENAI_API_KEY` : Clé API OpenAI (obligatoire)
- `NODE_ENV` : Environnement (development/production)
- `PORT` : Port du serveur (défaut: 3000)

### Paramètres de jeu (package.json)
```json
{
  "config": {
    "port": 3000,
    "max_players": 50,
    "question_time_limit": 10,
    "lives_per_player": 3
  }
}
```

## 🧪 Domaines scientifiques supportés

- 🔬 **Sciences Générales**
- ⚛️ **Physique**
- 🧪 **Chimie**
- 🧬 **Biologie**
- 🔢 **Mathématiques**
- 🌌 **Astronomie**
- 💻 **Informatique**
- ⚙️ **Technologie**
- 📝 **Domaines personnalisés**

## 🎯 Scripts disponibles

```bash
npm start          # Démarrer en production
npm run dev        # Démarrer en développement avec nodemon
npm run dev:debug  # Mode debug avec logs étendus
npm run prod       # Mode production optimisé
npm run health-check # Vérifier l'état de l'application
```

## 🔍 API Routes

- `GET /` : Interface joueurs
- `GET /admin` : Interface administration
- `GET /health` : Endpoint de santé
- `POST /api/generate-gpt-question` : Génération de questions IA

## 🌐 WebSocket Events

### Côté client
- `join-player` : Rejoindre comme joueur
- `player-answer` : Soumettre une réponse
- `rejoin-player` : Reconnexion automatique

### Côté serveur
- `player-joined` : Nouveau joueur connecté
- `question-start` : Début d'une question
- `game-end` : Fin du quiz

## 🔒 Sécurité

- Validation des variables d'environnement au démarrage
- Vérification du format des clés API
- Limitation du nombre de joueurs
- Gestion d'erreurs robuste avec fallbacks

## 📈 Monitoring

L'application inclut :
- Endpoint de santé (`/health`)
- Logs détaillés avec timestamps
- Gestion d'erreurs avec retry automatique
- Statistiques de jeu en temps réel

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**Rodevv972**
- GitHub: [@Rodevv972](https://github.com/Rodevv972)

## 🚀 Versions

- **v2.0.0** : Version GPT avec génération intelligente de questions
- Interface moderne et responsive
- Support multi-domaines scientifiques
- Administration avancée

---

**🔬 Explorez la science en vous amusant avec ScienceSquad-QUIZZ !**
