const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/summary', authMiddleware, feedbackController.summary);

module.exports = router;
