const { sessionService } = require('../services/sessionService');
const { sendError } = require('../utils/httpError');

// GET /api/feedback/summary   -> the logged-in volunteer's average rating and review count
exports.summary = async (req, res) => {
  try {
    const summary = await sessionService.ratingSummary(req.user.User_id);
    return res.status(200).json({ summary });
  } catch (err) {
    return sendError(res, err, 'Rating summary error');
  }
};
