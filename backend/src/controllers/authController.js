const bcrypt = require('bcrypt');
const db = require('../config/db');
const generateOTP = require('../utils/generateOTP');
const { sendVerificationEmail } = require('../utils/sendEmail');

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    // Check for duplicate email
    const [existing] = await db.query('SELECT User_id FROM User WHERE Email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP with 5-minute expiry
    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    // Insert into database
    await db.query(
      'INSERT INTO User (User_name, Email, Password, Verification_code, Verification_expiry) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, otp, expiry]
    );

    // Send OTP (mocked — will print to console)
    await sendVerificationEmail(email, otp);

    return res.status(201).json({
      message: 'Registration successful. Check your email for the verification code.',
      email,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};
exports.verifyOTP = async (req, res) => {
  const { email, code } = req.body;

  // Validate input
  if (!email || !code) {
    return res.status(400).json({ message: 'Email and verification code are required.' });
  }

  try {
    // Find user by email
    const [users] = await db.query(
      'SELECT User_id, Account_status, Verification_code, Verification_expiry FROM User WHERE Email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];

    // Check if already active
    if (user.Account_status === 'Active') {
      return res.status(400).json({ message: 'Account is already verified.' });
    }

    // Check code matches
    if (user.Verification_code !== code) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    // Check expiry
    const now = new Date();
    const expiry = new Date(user.Verification_expiry);
    if (now > expiry) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // Activate the account and clear verification fields
    await db.query(
      'UPDATE User SET Account_status = ?, Verification_code = NULL, Verification_expiry = NULL WHERE User_id = ?',
      ['Active', user.User_id]
    );

    return res.status(200).json({
      message: 'Account verified successfully. You can now log in.',
      email,
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [users] = await db.query(
      'SELECT User_id, Email, Password, Account_status FROM User WHERE Email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];

    if (user.Account_status !== 'Active') {
      return res.status(403).json({
        message: 'Account is not active. Please verify your email first.',
      });
    }

    const bcrypt = require('bcrypt');
    const match = await bcrypt.compare(password, user.Password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      'UPDATE User SET Verification_code = ?, Verification_expiry = ? WHERE User_id = ?',
      [otp, expiry, user.User_id]
    );

    await sendVerificationEmail(email, otp);

    return res.status(200).json({
      message: 'Credentials verified. Check your email for the login code.',
      requiresOTP: true,
      email,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.loginVerify = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'Email and login code are required.' });
  }

  try {
    const [users] = await db.query(
      'SELECT User_id, User_name, Email, Account_status, Verification_code, Verification_expiry FROM User WHERE Email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];

    if (user.Verification_code !== code) {
      return res.status(400).json({ message: 'Invalid login code.' });
    }

    const now = new Date();
    const expiry = new Date(user.Verification_expiry);
    if (now > expiry) {
      return res.status(400).json({ message: 'Login code has expired. Please log in again.' });
    }

    await db.query(
      'UPDATE User SET Verification_code = NULL, Verification_expiry = NULL WHERE User_id = ?',
      [user.User_id]
    );

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { User_id: user.User_id, Email: user.Email },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        User_id: user.User_id,
        User_name: user.User_name,
        Email: user.Email,
      },
    });
  } catch (err) {
    console.error('Login verify error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// 1. POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const [users] = await db.query('SELECT User_id FROM User WHERE Email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User with this email does not exist.' });
    }

    const user = users[0];
    const otp = generateOTP(); // Reuse your existing OTP generator
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.query(
      'UPDATE User SET Verification_code = ?, Verification_expiry = ? WHERE User_id = ?',
      [otp, expiry, user.User_id]
    );

    await sendVerificationEmail(email, otp); // Reuse your mock email sender

    return res.status(200).json({
      message: 'Password reset code sent to your email.',
      email,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// 2. POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    const [users] = await db.query(
      'SELECT User_id, Verification_code, Verification_expiry FROM User WHERE Email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];

    if (user.Verification_code !== code) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }

    const now = new Date();
    const expiry = new Date(user.Verification_expiry);
    if (now > expiry) {
      return res.status(400).json({ message: 'Reset code has expired.' });
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE User SET Password = ?, Verification_code = NULL, Verification_expiry = NULL WHERE User_id = ?',
      [hashedPassword, user.User_id]
    );

    return res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    // Check if user exists and is not yet active
    const [users] = await db.query(
      'SELECT User_id, Account_status FROM User WHERE Email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];

    if (user.Account_status === 'Active') {
      return res.status(400).json({ message: 'Account is already verified.' });
    }

    // Generate a fresh OTP and expiry
    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    // Save new OTP to database
    await db.query(
      'UPDATE User SET Verification_code = ?, Verification_expiry = ? WHERE User_id = ?',
      [otp, expiry, user.User_id]
    );

    // Send the real email
    await sendVerificationEmail(email, otp);

    return res.status(200).json({ message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};