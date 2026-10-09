const db = require('../config/db');

exports.getProfile = async (req, res) => {
  const userId = req.user.User_id;

  try {
    const [users] = await db.query(
      `SELECT User_id, User_name, Email, Account_status, Profile_picture, Created_at
       FROM User WHERE User_id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ user: users[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

exports.updateProfile = async (req, res) => {
  const userId = req.user.User_id;
  const { name, profile_picture } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters.' });
  }

  try {
    await db.query(
      'UPDATE User SET User_name = ?, Profile_picture = COALESCE(?, Profile_picture) WHERE User_id = ?',
      [name.trim(), profile_picture || null, userId]
    );

    const [users] = await db.query(
      'SELECT User_id, User_name, Email, Profile_picture FROM User WHERE User_id = ?',
      [userId]
    );

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: users[0],
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};