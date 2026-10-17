/** An error that carries the HTTP status the API should answer with. */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Answers with the HttpError's status, or a generic 500 (logged) for anything unexpected. */
function sendError(res, err, logLabel) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(`${logLabel}:`, err);
  return res.status(500).json({ message: 'Server error.' });
}

module.exports = { HttpError, sendError };
