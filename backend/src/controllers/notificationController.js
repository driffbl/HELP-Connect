const { notificationService } = require('../services/notificationService');
const { parseId } = require('../utils/sessionValidation');
const { sendError } = require('../utils/httpError');

// GET /api/notifications
exports.list = async (req, res) => {
  try {
    const result = await notificationService.list(req.user.User_id);
    return res.status(200).json(result);
  } catch (err) {
    return sendError(res, err, 'List notifications error');
  }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const result = await notificationService.markRead(req.user.User_id, parseId(req.params.id, 'notification id'));
    return res.status(200).json({ message: 'Notification marked as read.', notification: result });
  } catch (err) {
    return sendError(res, err, 'Mark notification read error');
  }
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    const result = await notificationService.markAllRead(req.user.User_id);
    return res.status(200).json({ message: 'All notifications marked as read.', ...result });
  } catch (err) {
    return sendError(res, err, 'Mark all notifications read error');
  }
};
