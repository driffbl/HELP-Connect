const express = require('express');
const router = express.Router();

// Use Case 3 (sessions, feedback, notifications). server.js mounts this once at /api.
router.use('/sessions', require('./sessionRoutes'));
router.use('/feedback', require('./feedbackRoutes'));
router.use('/notifications', require('./notificationRoutes'));

module.exports = router;
