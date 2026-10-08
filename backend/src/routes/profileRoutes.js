const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

// Both routes require authentication
router.get('/me', authMiddleware, profileController.getProfile);
router.put('/me', authMiddleware, profileController.updateProfile);

module.exports = router;