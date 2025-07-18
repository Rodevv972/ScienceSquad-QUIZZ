const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Fonction pour mélanger un tableau (Fisher-Yates shuffle)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Fonction pour normaliser les chaînes de caractères
function normalizeString(str) {
    return str
        .trim()
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Supprime la ponctuation
        .replace(/\s+/g, ' '); // Normalise les espaces
}

// Générer des questions avec distribution aléatoire des réponses
async function generateQuestions(topic, count, difficulty) {
    const questions = [];
    
    // Prompts optimisés selon la difficulté
    const difficultyPrompts = {
        'facile': 'niveau débutant, accessible au grand public',
        'moyen': 'niveau intermédiaire, pour des personnes curieuses de science',
        'difficile': 'niveau avancé, pour des passionnés de science',
        'progressif': 'niveau qui augmente progressivement de facile à difficile'
    };
    
    const systemPrompt = `Tu es un expert en ${topic} qui crée des questions de quiz scientifiques de qualité.

RÈGLES IMPORTANTES :
- Crée des questions pertinentes et sensées sur ${topic}
- Niveau : ${difficultyPrompts[difficulty]}
- Questions accessibles mais pas simplistes
- FORMAT RÉPONSE SIMPLE : 1 à 4 mots maximum par option
- Évite les questions pièges ou trop triviales
- Assure-toi que chaque question ait UNE SEULE réponse correcte claire
- Les 3 mauvaises réponses doivent être plausibles mais clairement incorrectes
- La réponse correcte doit être EXACTEMENT identique à une des options

FORMAT DE RÉPONSE OBLIGATOIRE :
{
  "question": "Votre question ici",
  "option_a": "Réponse courte A",
  "option_b": "Réponse courte B", 
  "option_c": "Réponse courte C",
  "option_d": "Réponse courte D",
  "correct_answer": "Réponse exacte",
  "explanation": "Explication concise en 1-2 phrases"
}

EXEMPLES DE BONNES QUESTIONS :
- "Quel est le symbole chimique de l'or ?" → "Au", "Ag", "Fe", "Cu"
- "Combien de chromosomes a l'humain ?" → "46", "44", "48", "42"
- "Quelle planète est la plus proche du Soleil ?" → "Mercure", "Vénus", "Mars", "Terre"`;

    try {
        for (let i = 0; i < count; i++) {
            const currentDifficulty = difficulty === 'progressif' ? 
                (i < count/3 ? 'facile' : i < count*2/3 ? 'moyen' : 'difficile') : 
                difficulty;
            
            const userPrompt = `Génère 1 question de ${topic} de niveau ${currentDifficulty}. 
            Question ${i + 1}/${count}.
            
            IMPÉRATIF : 
            - Question claire et directe
            - 4 options de 1 à 4 mots maximum
            - Réponse immédiatement identifiable
            - Adaptée à un timer de 10 secondes
            
            Respecte EXACTEMENT le format JSON demandé.`;

            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 600
            });

            const content = response.choices[0].message.content;
            
            // Nettoyer le contenu pour extraire uniquement le JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Format JSON invalide dans la réponse OpenAI');
            }
            
            const questionData = JSON.parse(jsonMatch[0]);
            
            // Créer les options comme tableau
            const options = [
                questionData.option_a,
                questionData.option_b,
                questionData.option_c,
                questionData.option_d
            ];
            
            // Normaliser toutes les options et la réponse correcte
            const normalizedOptions = options.map(normalizeString);
            const normalizedCorrectAnswer = normalizeString(questionData.correct_answer);
            
            // Trouver l'index de la bonne réponse avec comparaison améliorée
            let correctIndex = normalizedOptions.findIndex(option => 
                option === normalizedCorrectAnswer
            );
            
            // Si pas trouvé, essayer une recherche partielle
            if (correctIndex === -1) {
                correctIndex = normalizedOptions.findIndex(option => 
                    option.includes(normalizedCorrectAnswer) || 
                    normalizedCorrectAnswer.includes(option)
                );
            }
            
            // Si toujours pas trouvé, utiliser le premier index par défaut et logguer
            if (correctIndex === -1) {
                console.warn('⚠️ Réponse correcte non trouvée, utilisation de l\'option A par défaut');
                console.log('Options:', options);
                console.log('Réponse correcte:', questionData.correct_answer);
                correctIndex = 0; // Utiliser la première option par défaut
            }
            
            // MÉLANGER LES OPTIONS pour éviter les patterns
            const shuffledOptions = shuffleArray(options);
            const newCorrectIndex = shuffledOptions.findIndex(option => 
                normalizeString(option) === normalizeString(options[correctIndex])
            );
            
            questions.push({
                id: i + 1,
                question: questionData.question,
                options: shuffledOptions,
                correct: newCorrectIndex,
                explanation: questionData.explanation,
                difficulty: currentDifficulty,
                topic: topic
            });
            
            // Délai pour éviter les limites de rate
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return questions;
        
    } catch (error) {
        console.error('Erreur lors de la génération des questions:', error);
        throw error;
    }
}

// Générer une seule question (format réponse simple)
async function generateSingleQuestion(topic, difficulty, questionNumber, totalQuestions) {
    const difficultyPrompts = {
        'facile': 'niveau débutant, accessible au grand public',
        'moyen': 'niveau intermédiaire, pour des personnes curieuses de science',
        'difficile': 'niveau avancé, pour des passionnés de science'
    };
    
    const systemPrompt = `Tu es un expert en ${topic} qui crée des questions de quiz scientifiques de qualité.

RÈGLES IMPORTANTES :
- Crée une question pertinente et sensée sur ${topic}
- Niveau : ${difficultyPrompts[difficulty]}
- Question accessible mais pas simpliste
- FORMAT RÉPONSE SIMPLE : 1 à 4 mots maximum par option
- Évite les questions pièges ou trop triviales
- Assure-toi que la question ait UNE SEULE réponse correcte claire
- Les 3 mauvaises réponses doivent être plausibles mais clairement incorrectes
- Varie les aspects du sujet pour éviter la répétition
- La réponse correcte doit être EXACTEMENT identique à une des options

FORMAT DE RÉPONSE OBLIGATOIRE :
{
  "question": "Votre question ici",
  "option_a": "Réponse courte A",
  "option_b": "Réponse courte B", 
  "option_c": "Réponse courte C",
  "option_d": "Réponse courte D",
  "correct_answer": "Réponse exacte",
  "explanation": "Explication concise en 1-2 phrases"
}

EXEMPLES DE BONNES QUESTIONS :
- "Quel est le symbole chimique de l'or ?" → "Au", "Ag", "Fe", "Cu"
- "Combien de chromosomes a l'humain ?" → "46", "44", "48", "42"
- "Quelle planète est la plus proche du Soleil ?" → "Mercure", "Vénus", "Mars", "Terre"`;

    const userPrompt = `Génère 1 question de ${topic} de niveau ${difficulty}. 
    Question ${questionNumber}/${totalQuestions}.
    
    IMPÉRATIF : 
    - Question claire et directe
    - 4 options de 1 à 4 mots maximum
    - Réponse immédiatement identifiable
    - Adaptée à un timer de 10 secondes
    - Différente des questions typiques (sois créatif sur l'angle d'approche)
    
    Respecte EXACTEMENT le format JSON demandé.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.8, // Augmenté pour plus de créativité
            max_tokens: 600
        });

        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error('Format JSON invalide dans la réponse OpenAI');
        }
        
        const questionData = JSON.parse(jsonMatch[0]);
        
        // Traitement identique à la fonction originale
        const options = [
            questionData.option_a,
            questionData.option_b,
            questionData.option_c,
            questionData.option_d
        ];
        
        const normalizedOptions = options.map(normalizeString);
        const normalizedCorrectAnswer = normalizeString(questionData.correct_answer);
        
        let correctIndex = normalizedOptions.findIndex(option => 
            option === normalizedCorrectAnswer
        );
        
        if (correctIndex === -1) {
            correctIndex = normalizedOptions.findIndex(option => 
                option.includes(normalizedCorrectAnswer) || 
                normalizedCorrectAnswer.includes(option)
            );
        }
        
        if (correctIndex === -1) {
            console.warn('⚠️ Réponse correcte non trouvée, utilisation de l\'option A par défaut');
            correctIndex = 0;
        }
        
        const shuffledOptions = shuffleArray(options);
        const newCorrectIndex = shuffledOptions.findIndex(option => 
            normalizeString(option) === normalizeString(options[correctIndex])
        );
        
        return {
            id: questionNumber,
            question: questionData.question,
            options: shuffledOptions,
            correct: newCorrectIndex,
            explanation: questionData.explanation,
            difficulty: difficulty,
            topic: topic
        };
        
    } catch (error) {
        console.error('Erreur lors de la génération de la question unique:', error);
        throw error;
    }
}

module.exports = {
    generateQuestions,
    generateSingleQuestion
};
