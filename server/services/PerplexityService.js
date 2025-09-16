const axios = require('axios');

class PerplexityService {
  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY;
    this.baseUrl = 'https://api.perplexity.ai/chat/completions';
  }

  async generateQuestion(topic = 'science générale') {
    try {
      const prompt = `Génère une question de quiz en français sur le thème "${topic}". 
      
      Format de réponse requis (JSON strict):
      {
        "question": "La question ici",
        "choices": ["Choix A", "Choix B", "Choix C", "Choix D"],
        "correctAnswer": 0,
        "explanation": "Explication détaillée de la bonne réponse"
      }
      
      Critères:
      - Question claire et précise en français
      - 4 choix de réponse plausibles
      - correctAnswer doit être l'index (0-3) de la bonne réponse
      - Explication pédagogique et intéressante
      - Niveau de difficulté moyen
      - Sujet approprié pour un quiz live`;

      const response = await axios.post(this.baseUrl, {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en création de quiz éducatifs. Réponds uniquement en JSON valide sans markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content.trim();
      
      // Nettoyer le contenu pour extraire le JSON
      let jsonContent = content;
      if (content.includes('```json')) {
        jsonContent = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonContent = content.split('```')[1].split('```')[0].trim();
      }

      const questionData = JSON.parse(jsonContent);
      
      // Validation de la structure
      if (!questionData.question || !Array.isArray(questionData.choices) || 
          questionData.choices.length !== 4 || 
          typeof questionData.correctAnswer !== 'number' ||
          questionData.correctAnswer < 0 || questionData.correctAnswer > 3 ||
          !questionData.explanation) {
        throw new Error('Format de question invalide');
      }

      return {
        question: questionData.question,
        choices: questionData.choices,
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        timeLimit: 15
      };

    } catch (error) {
      console.error('Erreur lors de la génération de question:', error.message);
      
      // Question de secours en cas d'erreur
      return this.getFallbackQuestion();
    }
  }

  getFallbackQuestion() {
    const fallbackQuestions = [
      {
        question: "Quelle est la vitesse de la lumière dans le vide ?",
        choices: ["300 000 km/s", "150 000 km/s", "450 000 km/s", "600 000 km/s"],
        correctAnswer: 0,
        explanation: "La vitesse de la lumière dans le vide est d'environ 299 792 458 mètres par seconde, soit approximativement 300 000 km/s.",
        timeLimit: 15
      },
      {
        question: "Combien d'os y a-t-il dans le corps humain adulte ?",
        choices: ["186", "206", "226", "246"],
        correctAnswer: 1,
        explanation: "Le corps humain adulte contient 206 os. Ce nombre diminue par rapport à la naissance car certains os fusionnent pendant la croissance.",
        timeLimit: 15
      },
      {
        question: "Quelle planète est la plus proche du Soleil ?",
        choices: ["Vénus", "Mercure", "Mars", "Terre"],
        correctAnswer: 1,
        explanation: "Mercure est la planète la plus proche du Soleil, située à environ 58 millions de kilomètres de notre étoile.",
        timeLimit: 15
      }
    ];

    return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
  }
}

module.exports = PerplexityService;