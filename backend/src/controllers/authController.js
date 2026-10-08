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