const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const authMiddleware = require('../middleware/authMiddleware');

// Every route requires authentication
router.get('/', authMiddleware, sessionController.list);
router.post('/', authMiddleware, sessionController.create);
router.get('/:id', authMiddleware, sessionController.get);
router.patch('/:id/confirm', authMiddleware, sessionController.confirm);
router.patch('/:id/decline', authMiddleware, sessionController.decline);
router.patch('/:id/cancel', authMiddleware, sessionController.cancel);
router.patch('/:id/complete', authMiddleware, sessionController.complete);
router.post('/:id/feedback', authMiddleware, sessionController.addFeedback);

module.exports = router;
