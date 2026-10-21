/** All SQL for notifications. Connection first, like the session repository. */

function toNotification(row) {
  return {
    id: row.Notification_id,
    sessionId: row.Session_id,
    message: row.Message,
    status: row.Notification_status,
    createdAt: new Date(row.Created_at).toISOString(),
  };
}

async function insert(conn, { userId, sessionId, message }) {
  const [result] = await conn.query(
    'INSERT INTO Notification (User_id, Session_id, Message) VALUES (?, ?, ?)',
    [userId, sessionId, message]
  );
  return result.insertId;
}

/** Newest first. `limit` is clamped to a whole number between 1 and 100. */
async function listForUser(conn, userId, limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(Number(limit)) || 50));
  const [rows] = await conn.query(
    `SELECT Notification_id, Session_id, Message, Notification_status, Created_at
     FROM Notification WHERE User_id = ?
     ORDER BY Created_at DESC, Notification_id DESC LIMIT ?`,
    [userId, safeLimit]
  );
  return rows.map(toNotification);
}

async function countUnread(conn, userId) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS Total FROM Notification WHERE User_id = ? AND Notification_status = 'Unread'",
    [userId]
  );
  return Number(rows[0].Total);
}

/**
 * Marks one of the user's own notifications read. Returns false when it does not exist or is not theirs.
 * Existence is checked with a SELECT so the answer does not depend on how the driver counts "affected" rows.
 */
async function markRead(conn, userId, id) {
  await conn.query(
    "UPDATE Notification SET Notification_status = 'Read' WHERE Notification_id = ? AND User_id = ?",
    [id, userId]
  );
  const [rows] = await conn.query(
    'SELECT Notification_id FROM Notification WHERE Notification_id = ? AND User_id = ?',
    [id, userId]
  );
  return rows.length === 1;
}

async function markAllRead(conn, userId) {
  const [result] = await conn.query(
    "UPDATE Notification SET Notification_status = 'Read' WHERE User_id = ? AND Notification_status = 'Unread'",
    [userId]
  );
  return result.affectedRows;
}

module.exports = { toNotification, insert, listForUser, countUnread, markRead, markAllRead };
