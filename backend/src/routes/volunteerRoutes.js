const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const authMiddleware = require('../middleware/authMiddleware');

// Public
router.get('/categories', volunteerController.listCategories);

// Protected
router.post('/register', authMiddleware, volunteerController.register);
router.get('/me', authMiddleware, volunteerController.getProfile);

module.exports = router;