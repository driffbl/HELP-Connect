const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, notificationController.list);
router.patch('/read-all', authMiddleware, notificationController.markAllRead);
router.patch('/:id/read', authMiddleware, notificationController.markRead);

module.exports = router;
