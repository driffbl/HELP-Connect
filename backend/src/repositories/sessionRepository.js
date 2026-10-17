/**
 * All SQL for sessions and feedback. Every function takes the connection first so the caller
 * decides which transaction it runs in. DATE and TIME are formatted in SQL so the API always
 * returns plain 'YYYY-MM-DD' and 'HH:mm' strings, whatever the server's time zone.
 */

const SELECT_SESSION = `
  SELECT s.Session_id, s.Student_user_id, su.User_name AS Student_name,
         s.Volunteer_user_id, vu.User_name AS Volunteer_name,
         s.Title, s.Category,
         DATE_FORMAT(s.Session_date, '%Y-%m-%d') AS Session_date,
         TIME_FORMAT(s.Session_time, '%H:%i') AS Session_time,
         s.Support_mode, s.Session_status, s.Proposed_by, s.Created_at,
         f.Feedback_id, f.Rating, f.Comments, f.Created_at AS Feedback_created_at
  FROM Support_session s
  JOIN User su ON su.User_id = s.Student_user_id
  JOIN User vu ON vu.User_id = s.Volunteer_user_id
  LEFT JOIN Feedback f ON f.Session_id = s.Session_id`;

/** One database row -> the session object the API returns (same shape as the Angular model). */
function toSession(row) {
  return {
    id: row.Session_id,
    studentId: row.Student_user_id,
    studentName: row.Student_name,
    volunteerId: row.Volunteer_user_id,
    volunteerName: row.Volunteer_name,
    title: row.Title,
    category: row.Category,
    date: row.Session_date,
    time: row.Session_time,
    mode: row.Support_mode,
    status: row.Session_status,
    proposedBy: row.Proposed_by,
    createdAt: new Date(row.Created_at).toISOString(),
    review:
      row.Feedback_id === null || row.Feedback_id === undefined
        ? null
        : {
            id: row.Feedback_id,
            sessionId: row.Session_id,
            studentId: row.Student_user_id,
            volunteerId: row.Volunteer_user_id,
            rating: row.Rating,
            comment: row.Comments,
            createdAt: new Date(row.Feedback_created_at).toISOString(),
          },
  };
}

async function findById(conn, id) {
  const [rows] = await conn.query(`${SELECT_SESSION} WHERE s.Session_id = ?`, [id]);
  return rows.length === 0 ? null : toSession(rows[0]);
}

/** role: 'student', 'volunteer', or undefined for both sides. Newest first. */
async function listForUser(conn, userId, role) {
  let where = '(s.Student_user_id = ? OR s.Volunteer_user_id = ?)';
  let params = [userId, userId];
  if (role === 'student') {
    where = 's.Student_user_id = ?';
    params = [userId];
  } else if (role === 'volunteer') {
    where = 's.Volunteer_user_id = ?';
    params = [userId];
  }
  const [rows] = await conn.query(
    `${SELECT_SESSION} WHERE ${where} ORDER BY s.Created_at DESC, s.Session_id DESC`,
    params
  );
  return rows.map(toSession);
}

/** Pending sessions whose start time is at or before `nowSql` ('YYYY-MM-DD HH:mm:ss'). */
async function findStalePending(conn, nowSql) {
  const [rows] = await conn.query(
    `${SELECT_SESSION}
     WHERE s.Session_status = 'Pending' AND TIMESTAMP(s.Session_date, s.Session_time) <= ?`,
    [nowSql]
  );
  return rows.map(toSession);
}

/**
 * Moves a session from one status to another only if it is still in `from`.
 * Returns false when someone else changed it first. `clearProposer` is used when a request is accepted.
 */
async function setStatus(conn, id, from, to, { clearProposer = false } = {}) {
  const [result] = await conn.query(
    `UPDATE Support_session
     SET Session_status = ?, Proposed_by = IF(?, NULL, Proposed_by)
     WHERE Session_id = ? AND Session_status = ?`,
    [to, clearProposer ? 1 : 0, id, from]
  );
  return result.affectedRows === 1;
}

/** New requests always start Pending and are proposed by the student. */
async function insertSession(conn, data) {
  const [result] = await conn.query(
    `INSERT INTO Support_session
       (Student_user_id, Volunteer_user_id, Title, Category, Session_date, Session_time,
        Support_mode, Session_status, Proposed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 'student')`,
    [data.studentId, data.volunteerId, data.title, data.category, data.date, data.time, data.mode]
  );
  return result.insertId;
}

async function insertFeedback(conn, { sessionId, rating, comment }) {
  const [result] = await conn.query(
    'INSERT INTO Feedback (Session_id, Rating, Comments) VALUES (?, ?, ?)',
    [sessionId, rating, comment]
  );
  return result.insertId;
}

async function findUser(conn, userId) {
  const [rows] = await conn.query(
    'SELECT User_id, User_name, Account_status FROM User WHERE User_id = ?',
    [userId]
  );
  return rows.length === 0
    ? null
    : { id: rows[0].User_id, name: rows[0].User_name, status: rows[0].Account_status };
}

/** Average and count of the ratings a volunteer has received. */
async function ratingSummary(conn, volunteerId) {
  const [rows] = await conn.query(
    `SELECT AVG(f.Rating) AS Average, COUNT(f.Feedback_id) AS Total
     FROM Feedback f
     JOIN Support_session s ON s.Session_id = f.Session_id
     WHERE s.Volunteer_user_id = ?`,
    [volunteerId]
  );
  const total = Number(rows[0].Total);
  return { average: total === 0 ? null : Number(rows[0].Average), count: total };
}

module.exports = {
  toSession,
  findById,
  listForUser,
  findStalePending,
  setStatus,
  insertSession,
  insertFeedback,
  findUser,
  ratingSummary,
};
