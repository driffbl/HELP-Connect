const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/categories', volunteerController.listCategories);
router.get('/skills', volunteerController.listSkills);
router.put('/update', authMiddleware, volunteerController.updateProfile);
router.post('/register', authMiddleware, volunteerController.register);
router.get('/me', authMiddleware, volunteerController.getProfile);

module.exports = router;