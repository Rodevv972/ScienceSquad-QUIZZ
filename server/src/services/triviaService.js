const { GPTQuizService } = require('./GPTQuizService');
const gptQuizService = new GPTQuizService();

async function generateSingleQuestion(topic, difficulty, questionNumber, totalQuestions, sessionId = 'default') {
    return await gptQuizService.generateSingleQuestion(topic, difficulty, questionNumber, totalQuestions, sessionId);
}

module.exports = {
    generateSingleQuestion
};