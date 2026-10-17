const { sessionService } = require('../services/sessionService');
const { parseId } = require('../utils/sessionValidation');
const { sendError } = require('../utils/httpError');

// GET /api/sessions?role=student|volunteer   (role is optional)
exports.list = async (req, res) => {
  try {
    const sessions = await sessionService.listSessions(req.user.User_id, req.query.role);
    return res.status(200).json({ sessions });
  } catch (err) {
    return sendError(res, err, 'List sessions error');
  }
};

// GET /api/sessions/:id
exports.get = async (req, res) => {
  try {
    const session = await sessionService.getSession(req.user.User_id, parseId(req.params.id, 'session id'));
    return res.status(200).json({ session });
  } catch (err) {
    return sendError(res, err, 'Get session error');
  }
};

// POST /api/sessions   { volunteerId, title, category, date, time, mode }
exports.create = async (req, res) => {
  try {
    const session = await sessionService.createSession(req.user.User_id, req.body);
    return res.status(201).json({ message: 'Session requested.', session });
  } catch (err) {
    return sendError(res, err, 'Create session error');
  }
};

function transition(serviceMethod, message, logLabel) {
  return async (req, res) => {
    try {
      const session = await sessionService[serviceMethod](req.user.User_id, parseId(req.params.id, 'session id'));
      return res.status(200).json({ message, session });
    } catch (err) {
      return sendError(res, err, logLabel);
    }
  };
}

// PATCH /api/sessions/:id/confirm | decline | cancel | complete
exports.confirm = transition('confirmSession', 'Session accepted.', 'Confirm session error');
exports.decline = transition('declineSession', 'Request declined.', 'Decline session error');
exports.cancel = transition('cancelSession', 'Session cancelled.', 'Cancel session error');
exports.complete = transition('completeSession', 'Session marked as completed.', 'Complete session error');

// POST /api/sessions/:id/feedback   { rating, comment? }
exports.addFeedback = async (req, res) => {
  try {
    const session = await sessionService.addFeedback(
      req.user.User_id,
      parseId(req.params.id, 'session id'),
      req.body
    );
    return res.status(201).json({ message: 'Feedback submitted.', session });
  } catch (err) {
    return sendError(res, err, 'Add feedback error');
  }
};
