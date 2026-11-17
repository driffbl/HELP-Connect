const db = require('../config/db');

// POST /api/volunteer/register
exports.register = async (req, res) => {
  const userId = req.user.User_id;
  const { availability, preferred_mode, bio, category_ids, skill_ids } = req.body;

  if (!availability || !preferred_mode) {
    return res.status(400).json({ message: 'Availability and preferred mode are required.' });
  }

  if (!['Virtual', 'Face-to-Face', 'Both'].includes(preferred_mode)) {
    return res.status(400).json({ message: 'Invalid preferred mode.' });
  }

  if (!Array.isArray(category_ids) || category_ids.length === 0) {
    return res.status(400).json({ message: 'Please select at least one support category.' });
  }

  try {
    const [existing] = await db.query(
      'SELECT Volunteer_id FROM Volunteer WHERE User_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'You are already registered as a volunteer.' });
    }

    const [result] = await db.query(
      'INSERT INTO Volunteer (User_id, Availability, Preferred_Support_Mode, Bio) VALUES (?, ?, ?, ?)',
      [userId, availability, preferred_mode, bio || null]
    );

    const volunteerId = result.insertId;

    const catValues = category_ids.map((cid) => [volunteerId, cid]);
    await db.query(
      'INSERT INTO Volunteer_Category (Volunteer_id, Category_id) VALUES ?',
      [catValues]
    );

    if (Array.isArray(skill_ids) && skill_ids.length > 0) {
      const skillValues = skill_ids.map((sid) => [volunteerId, sid]);
      await db.query(
        'INSERT INTO Volunteer_Skill (Volunteer_id, Skills_id) VALUES ?',
        [skillValues]
      );
    }

    return res.status(201).json({
      message: 'Successfully registered as a volunteer!',
      volunteer_id: volunteerId,
    });
  } catch (err) {
    console.error('Volunteer register error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/volunteer/me
exports.getProfile = async (req, res) => {
  const userId = req.user.User_id;

  try {
    const [vols] = await db.query(
      `SELECT v.Volunteer_id, v.Availability,
              v.Preferred_Support_Mode AS Preferred_Mode,
              v.Bio, u.User_name, u.Email
       FROM Volunteer v
       JOIN User u ON u.User_id = v.User_id
       WHERE v.User_id = ?`,
      [userId]
    );

    if (vols.length === 0) {
      return res.status(404).json({ message: 'You are not registered as a volunteer.' });
    }

    const volunteer = vols[0];

    const [cats] = await db.query(
      `SELECT c.Category_id, c.Category_name
       FROM Volunteer_Category vc
       JOIN Category c ON c.Category_id = vc.Category_id
       WHERE vc.Volunteer_id = ?`,
      [volunteer.Volunteer_id]
    );

    const [skills] = await db.query(
      `SELECT s.Skills_id, s.Skill_name
       FROM Volunteer_Skill vs
       JOIN Skills s ON s.Skills_id = vs.Skills_id
       WHERE vs.Volunteer_id = ?`,
      [volunteer.Volunteer_id]
    );

    return res.status(200).json({
      volunteer: { ...volunteer, categories: cats, skills: skills },
    });
  } catch (err) {
    console.error('Get volunteer profile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/volunteer/categories
exports.listCategories = async (req, res) => {
  try {
    const [cats] = await db.query('SELECT Category_id, Category_name FROM Category');
    return res.status(200).json({ categories: cats });
  } catch (err) {
    console.error('List categories error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/volunteer/skills
exports.listSkills = async (req, res) => {
  try {
    const [skills] = await db.query('SELECT Skills_id, Skill_name FROM Skills');
    return res.status(200).json({ skills });
  } catch (err) {
    console.error('List skills error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/volunteer/update
exports.updateProfile = async (req, res) => {
  const userId = req.user.User_id;
  const { availability, preferred_mode, bio, category_ids, skill_ids } = req.body;

  // --- ADDED VALIDATION HERE ---
  if (!availability || !preferred_mode) {
    return res.status(400).json({ message: 'Availability and preferred mode are required.' });
  }

  if (!['Virtual', 'Face-to-Face', 'Both'].includes(preferred_mode)) {
    return res.status(400).json({ message: 'Invalid preferred mode.' });
  }

  if (!Array.isArray(category_ids) || category_ids.length === 0) {
    return res.status(400).json({ message: 'Please select at least one support category.' });
  }
  // -----------------------------

  try {
    const [vols] = await db.query('SELECT Volunteer_id FROM Volunteer WHERE User_id = ?', [userId]);
    if (vols.length === 0) return res.status(404).json({ message: 'Volunteer not found.' });
    const volunteerId = vols[0].Volunteer_id;

    await db.query(
      'UPDATE Volunteer SET Availability = ?, Preferred_Support_Mode = ?, Bio = ? WHERE Volunteer_id = ?',
      [availability, preferred_mode, bio || null, volunteerId]
    );

    await db.query('DELETE FROM Volunteer_Category WHERE Volunteer_id = ?', [volunteerId]);
    if (category_ids?.length > 0) {
      const catValues = category_ids.map(cid => [volunteerId, cid]);
      await db.query('INSERT INTO Volunteer_Category (Volunteer_id, Category_id) VALUES ?', [catValues]);
    }

    await db.query('DELETE FROM Volunteer_Skill WHERE Volunteer_id = ?', [volunteerId]);
    if (skill_ids?.length > 0) {
      const skillValues = skill_ids.map(sid => [volunteerId, sid]);
      await db.query('INSERT INTO Volunteer_Skill (Volunteer_id, Skills_id) VALUES ?', [skillValues]);
    }

    return res.status(200).json({ message: 'Updated successfully!' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};