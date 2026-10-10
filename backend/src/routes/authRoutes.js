const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/verify', authController.verifyOTP);
router.post('/login', authController.login);
router.post('/login-verify', authController.loginVerify);

module.exports = router;