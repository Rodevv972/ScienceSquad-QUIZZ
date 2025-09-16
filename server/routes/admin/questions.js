const express = require('express');
const router = express.Router();
const Question = require('../../models/Question');
const AdminLog = require('../../models/AdminLog');
const { authenticateAdmin, requirePermission } = require('../../middleware/auth');
const multer = require('multer');
const csv = require('csvtojson');
const fs = require('fs');

// Middleware
router.use(authenticateAdmin);

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/temp/' });

// Get all questions with filtering and pagination
router.get('/', requirePermission('manageQuestions'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      difficulty = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };
    
    // Search filter
    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { explanation: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Difficulty filter
    if (difficulty) {
      query.difficulty = difficulty;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const questions = await Question
      .find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Question.countDocuments(query);

    res.json({
      questions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des questions' });
  }
});

// Get question categories and statistics
router.get('/categories', requirePermission('manageQuestions'), async (req, res) => {
  try {
    const categories = await Question.aggregate([
      { $match: { isActive: true } },
      { 
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          subcategories: { $addToSet: '$subcategory' },
          difficulties: { $addToSet: '$difficulty' },
          averageUsage: { $avg: '$usage.timesUsed' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
  }
});

// Create a new question
router.post('/', requirePermission('manageQuestions'), async (req, res) => {
  try {
    const {
      question,
      choices,
      correctAnswer,
      explanation,
      category = 'Science',
      subcategory = 'General',
      difficulty = 'medium',
      timeLimit = 15,
      tags = []
    } = req.body;

    // Validation
    if (!question || !choices || choices.length !== 4 || correctAnswer < 0 || correctAnswer > 3) {
      return res.status(400).json({ message: 'Données de question invalides' });
    }

    const newQuestion = new Question({
      question,
      choices,
      correctAnswer,
      explanation,
      category,
      subcategory,
      difficulty,
      timeLimit,
      tags,
      createdBy: req.admin.username
    });

    await newQuestion.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'question_add',
      targetType: 'question',
      targetId: newQuestion._id.toString(),
      targetName: question.substring(0, 50) + '...',
      details: { category, difficulty }
    });

    res.status(201).json({ message: 'Question créée avec succès', question: newQuestion });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la question' });
  }
});

// Update a question
router.put('/:id', requirePermission('manageQuestions'), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }

    const oldData = { ...question.toObject() };

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== '_id' && key !== 'createdBy') {
        question[key] = req.body[key];
      }
    });

    await question.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'question_edit',
      targetType: 'question',
      targetId: question._id.toString(),
      targetName: question.question.substring(0, 50) + '...',
      details: { changes: req.body }
    });

    res.json({ message: 'Question mise à jour avec succès', question });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la question' });
  }
});

// Delete a question (soft delete)
router.delete('/:id', requirePermission('manageQuestions'), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }

    question.isActive = false;
    await question.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'question_delete',
      targetType: 'question',
      targetId: question._id.toString(),
      targetName: question.question.substring(0, 50) + '...',
      details: { category: question.category }
    });

    res.json({ message: 'Question supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la question' });
  }
});

// Import questions from CSV
router.post('/import', requirePermission('manageQuestions'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const csvData = await csv().fromFile(req.file.path);
    
    const questions = [];
    const errors = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      try {
        // Validate and parse CSV row
        const question = new Question({
          question: row.question,
          choices: [row.choice1, row.choice2, row.choice3, row.choice4],
          correctAnswer: parseInt(row.correctAnswer),
          explanation: row.explanation,
          category: row.category || 'Science',
          subcategory: row.subcategory || 'General',
          difficulty: row.difficulty || 'medium',
          timeLimit: parseInt(row.timeLimit) || 15,
          tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : [],
          createdBy: req.admin.username
        });

        questions.push(question);
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }

    // Save valid questions
    if (questions.length > 0) {
      await Question.insertMany(questions);
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'question_import',
      targetType: 'question',
      details: { 
        imported: questions.length,
        errors: errors.length,
        filename: req.file.originalname
      }
    });

    res.json({
      message: `Import terminé: ${questions.length} questions importées`,
      imported: questions.length,
      errors
    });
  } catch (error) {
    console.error('Error importing questions:', error);
    // Clean up file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Erreur lors de l\'import des questions' });
  }
});

// Export questions to CSV
router.get('/export', requirePermission('manageQuestions'), async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    
    const query = { isActive: true };
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    const questions = await Question.find(query);

    // Convert to CSV format
    const csvData = questions.map(q => ({
      question: q.question,
      choice1: q.choices[0],
      choice2: q.choices[1],
      choice3: q.choices[2],
      choice4: q.choices[3],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      category: q.category,
      subcategory: q.subcategory,
      difficulty: q.difficulty,
      timeLimit: q.timeLimit,
      tags: q.tags.join(', ')
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=questions.json');
    res.json(csvData);
  } catch (error) {
    console.error('Error exporting questions:', error);
    res.status(500).json({ message: 'Erreur lors de l\'export des questions' });
  }
});

// Get question statistics
router.get('/statistics', requirePermission('viewStatistics'), async (req, res) => {
  try {
    const stats = await Question.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageUsage: { $avg: '$usage.timesUsed' },
          byDifficulty: {
            $push: {
              difficulty: '$difficulty',
              usage: '$usage.timesUsed',
              correctRate: '$usage.correctAnswerRate'
            }
          },
          byCategory: {
            $push: {
              category: '$category',
              usage: '$usage.timesUsed'
            }
          }
        }
      }
    ]);

    // Group by difficulty and category
    const difficultyStats = {};
    const categoryStats = {};

    if (stats[0]) {
      stats[0].byDifficulty.forEach(item => {
        if (!difficultyStats[item.difficulty]) {
          difficultyStats[item.difficulty] = { count: 0, totalUsage: 0, totalCorrectRate: 0 };
        }
        difficultyStats[item.difficulty].count++;
        difficultyStats[item.difficulty].totalUsage += item.usage;
        difficultyStats[item.difficulty].totalCorrectRate += item.correctRate;
      });

      stats[0].byCategory.forEach(item => {
        if (!categoryStats[item.category]) {
          categoryStats[item.category] = { count: 0, totalUsage: 0 };
        }
        categoryStats[item.category].count++;
        categoryStats[item.category].totalUsage += item.usage;
      });
    }

    res.json({
      total: stats[0]?.total || 0,
      averageUsage: stats[0]?.averageUsage || 0,
      difficultyStats,
      categoryStats
    });
  } catch (error) {
    console.error('Error fetching question statistics:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

module.exports = router;