const OpenAI = require('openai');
const { QuestionMemory } = require('./QuestionMemory'); // mémoire MongoDB pour les questions

class GPTQuizService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.questionMemory = new QuestionMemory();
    }

    async generateSingleQuestion(topic, difficulty, questionNumber, totalQuestions, sessionId = 'default') {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Génération GPT - Tentative ${attempt}/${maxRetries} - Question ${questionNumber}/${totalQuestions}`);

                const question = await this.generateWithGPT(topic, difficulty, questionNumber, totalQuestions);

                // Vérification asynchrone anti-doublon
                if (await this.questionMemory.isQuestionUsed(sessionId, question.question, question.options)) {
                    console.log('⚠️ Question similaire déjà utilisée, nouvelle tentative...');
                    continue;
                }

                // Marquer la question comme utilisée
                await this.questionMemory.markQuestionUsed(sessionId, question.question, question.options);

                console.log('✅ Question GPT générée avec succès');
                return question;

            } catch (error) {
                console.warn(`⚠️ Tentative ${attempt} échouée:`, error.message);
                lastError = error;

                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Attente ${delay}ms avant nouvelle tentative...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // Fallback si toutes les tentatives échouent
        console.log('🔄 Toutes les tentatives GPT ont échoué, utilisation du fallback...');
        return this.getEmergencyQuestion(topic, difficulty, questionNumber);
    }

    async generateWithGPT(topic, difficulty, questionNumber, totalQuestions) {
        const prompt = this.buildPrompt(topic, difficulty, questionNumber, totalQuestions);

        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: this.getSystemPrompt() },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 800,
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        return this.parseAndValidateResponse(content, topic, difficulty, questionNumber);
    }

    buildPrompt(topic, difficulty, questionNumber, totalQuestions) {
        const difficultyMap = {
            'facile': 'niveau lycée/début université',
            'moyen': 'niveau universitaire',
            'difficile': 'niveau master/expert'
        };

        const topicContext = this.getTopicContext(topic);
        const antiRepetitionHint = this.getAntiRepetitionHint();

        return `
Génère une question de quiz scientifique en français avec les spécifications suivantes :

📋 CONTEXTE :
- Domaine : ${topicContext.name}
- Focus spécifique : ${topicContext.focus}
- Niveau de difficulté : ${difficultyMap[difficulty]}
- Question ${questionNumber}/${totalQuestions} de cette session

🎯 CONSIGNES STRICTES :
1. Question claire et concise (**1 phrase maximum, moins de 15 mots**)
2. Exactement 4 options de réponse plausibles (A, B, C, D)
3. UNE SEULE réponse correcte
4. Explication pédagogique très courte (1 à 2 phrases, moins de 40 mots)
5. Éviter les questions trop évidentes ou les pièges injustes
6. Adapter le vocabulaire au niveau demandé

📝 FORMAT JSON REQUIS (RESPECTER EXACTEMENT) :
{
    "question": "Votre question scientifique concise ?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 2,
    "explanation": "Explication pédagogique claire et très courte.",
    "difficulty": "${difficulty}",
    "topic": "${topic}",
    "source_hint": "Domaine ou concept clé pour approfondir"
}

${antiRepetitionHint}

⚠️ IMPORTANT : Retourne uniquement le JSON, sans texte supplémentaire.
`;
    }

    getTopicContext(topic) {
        const contexts = {
            'physique': {
                name: 'Physique',
                focus: 'mécanique classique, thermodynamique, électromagnétisme, optique, physique quantique, relativité'
            },
            'chimie': {
                name: 'Chimie',
                focus: 'structure atomique, liaisons chimiques, réactions, équilibres, cinétique, chimie organique'
            },
            'biologie': {
                name: 'Biologie',
                focus: 'biologie cellulaire, génétique, évolution, écologie, physiologie, microbiologie'
            },
            'mathematiques': {
                name: 'Mathématiques',
                focus: 'algèbre, analyse, géométrie, statistiques, probabilités, logique mathématique'
            },
            'astronomie': {
                name: 'Astronomie et Astrophysique',
                focus: 'système solaire, étoiles, galaxies, cosmologie, exoplanètes, physique stellaire'
            },
            'informatique': {
                name: 'Informatique et Sciences du Numérique',
                focus: 'algorithmes, programmation, réseaux, intelligence artificielle, sécurité, bases de données'
            },
            'sciences-generales': {
                name: 'Sciences Générales',
                focus: 'concepts fondamentaux interdisciplinaires, découvertes scientifiques, méthode scientifique'
            },
            'technologie': {
                name: 'Technologie et Ingénierie',
                focus: 'innovations technologiques, matériaux, énergie, robotique, nanotechnologies'
            }
        };

        if (!contexts[topic]) {
            return {
                name: topic.charAt(0).toUpperCase() + topic.slice(1),
                focus: 'concepts fondamentaux, applications pratiques, développements récents'
            };
        }

        return contexts[topic];
    }

    getSystemPrompt() {
        return `
Tu es un expert pédagogue et scientifique spécialisé dans la création de quiz éducatifs de haute qualité.

🎯 MISSION : Créer des questions qui :
✅ Testent la compréhension conceptuelle, pas seulement la mémorisation
✅ Sont scientifiquement rigoureuses et à jour
✅ Incluent des explications qui enrichissent les connaissances
✅ Respectent le niveau de difficulté demandé
✅ Sont formulées en français naturel et accessible

📚 EXPERTISE : 
- Connaissance approfondie des sciences
- Pédagogie adaptée au niveau universitaire français
- Capacité à expliquer simplement des concepts complexes

🎨 STYLE :
- Questions stimulantes mais équitables
- Explications qui vont au-delà de la définition
- Vocabulaire adapté au niveau requis
- Éviter le jargon excessif

⚖️ QUALITÉ :
- Vérifier la cohérence scientifique
- Options de réponse plausibles mais distinctes
- Une seule réponse incontestablement correcte
- Explication pédagogique enrichissante

🔔 Les questions doivent être très courtes (moins de 15 mots) pour être lisibles et compréhensibles en moins de 10 secondes.
- Les explications doivent être aussi concises que possible (moins de 40 mots).
`;
    }

    getAntiRepetitionHint() {
        const usedQuestions = this.questionMemory.getRecentQuestions();
        if (usedQuestions.length === 0) return '';

        return `
🔄 ÉVITER LES RÉPÉTITIONS :
Les questions récentes ont porté sur : ${usedQuestions.slice(-3).join(', ')}
Choisis un angle ou concept différent dans le même domaine.
`;
    }

    parseAndValidateResponse(content, topic, difficulty, questionNumber) {
        try {
            const parsed = JSON.parse(content);

            this.validateQuestionStructure(parsed);

            if (parsed.question.split(' ').length > 15) {
                throw new Error('La question générée est trop longue (plus de 15 mots)');
            }
            if (parsed.explanation.split(' ').length > 40) {
                throw new Error("L'explication générée est trop longue (plus de 40 mots)");
            }

            return {
                id: questionNumber,
                question: parsed.question.trim(),
                options: parsed.options.map(opt => opt.trim()),
                correct: parseInt(parsed.correct),
                explanation: parsed.explanation.trim(),
                difficulty: difficulty,
                topic: topic,
                source_hint: parsed.source_hint || topic,
                generated_at: new Date().toISOString(),
                model_used: 'gpt-3.5-turbo'
            };
        } catch (error) {
            console.error('❌ Erreur parsing/validation JSON GPT:', error.message);
            console.error('📄 Contenu reçu:', content);
            throw new Error(`Format ou longueur de réponse GPT invalide: ${error.message}`);
        }
    }

    validateQuestionStructure(parsed) {
        const errors = [];

        if (!parsed.question || typeof parsed.question !== 'string') {
            errors.push('Question manquante ou invalide');
        }

        if (!Array.isArray(parsed.options) || parsed.options.length !== 4) {
            errors.push('Exactement 4 options requises');
        }

        if (typeof parsed.correct !== 'number' || parsed.correct < 0 || parsed.correct > 3) {
            errors.push('Index de réponse correcte invalide (doit être 0-3)');
        }

        if (!parsed.explanation || typeof parsed.explanation !== 'string') {
            errors.push('Explication manquante ou invalide');
        }

        if (parsed.options && parsed.options.some(opt => !opt || opt.trim().length === 0)) {
            errors.push('Options vides détectées');
        }

        if (errors.length > 0) {
            throw new Error(`Validation échouée: ${errors.join(', ')}`);
        }
    }

    getEmergencyQuestion(topic, difficulty, questionNumber) {
        const fallbackQuestions = {
            'physique': {
                question: "Quelle est l'unité SI de la force ?",
                options: ["Newton (N)", "Joule (J)", "Watt (W)", "Pascal (Pa)"],
                correct: 0,
                explanation: "Le Newton (N) est l'unité SI de la force. Il correspond à 1 kg·m/s²."
            },
            'chimie': {
                question: "Quel est l'élément le plus abondant de l'univers ?",
                options: ["Hydrogène", "Hélium", "Oxygène", "Carbone"],
                correct: 0,
                explanation: "L'hydrogène est l'élément le plus abondant, représentant environ 75% de la matière normale."
            },
            'biologie': {
                question: "Où se trouve l'ADN chez les eucaryotes ?",
                options: ["Mitochondrie", "Noyau", "Ribosome", "Réticulum endoplasmique"],
                correct: 1,
                explanation: "Chez les eucaryotes, l'ADN est principalement dans le noyau, protégé par l'enveloppe nucléaire."
            }
        };

        const fallback = fallbackQuestions[topic] || fallbackQuestions['physique'];

        return {
            id: questionNumber,
            question: fallback.question,
            options: fallback.options,
            correct: fallback.correct,
            explanation: fallback.explanation,
            difficulty: difficulty,
            topic: topic,
            source_hint: 'Question de secours',
            generated_at: new Date().toISOString(),
            model_used: 'fallback'
        };
    }
}

module.exports = {
    GPTQuizService
};