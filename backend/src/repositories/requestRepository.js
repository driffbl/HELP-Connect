/**
 * SQL on the Support_request table (Use Case 2), used by the sync service so a request and its
 * session change together inside one transaction. Every function takes the connection first.
 * DATE is formatted in SQL so the date is always a plain 'YYYY-MM-DD' string.
 */

const SELECT_REQUEST = `
  SELECT sr.Request_id, sr.User_id AS Student_user_id, su.User_name AS Student_name,
         sr.Volunteer_id, v.User_id AS Volunteer_user_id,
         sr.Category_id, c.Category_name,
         sr.Description,
         DATE_FORMAT(sr.Preferred_date, '%Y-%m-%d') AS Preferred_date,
         sr.Preferred_time, sr.Support_mode, sr.Request_status
  FROM Support_request sr
  JOIN User su ON su.User_id = sr.User_id
  JOIN Category c ON c.Category_id = sr.Category_id
  LEFT JOIN Volunteer v ON v.Volunteer_id = sr.Volunteer_id`;

function toRequest(row) {
  return {
    id: row.Request_id,
    studentId: row.Student_user_id,
    studentName: row.Student_name,
    volunteerRecordId: row.Volunteer_id ?? null, // the Volunteer table id (not a User id)
    volunteerUserId: row.Volunteer_user_id ?? null,
    category: row.Category_name,
    description: row.Description,
    date: row.Preferred_date,
    timeText: row.Preferred_time, // free text such as '09:00' or '9:00 AM'
    mode: row.Support_mode,
    status: row.Request_status,
  };
}

async function findRequest(conn, id) {
  const [rows] = await conn.query(`${SELECT_REQUEST} WHERE sr.Request_id = ?`, [id]);
  return rows.length === 0 ? null : toRequest(rows[0]);
}

async function insertRequest(conn, d) {
  const [result] = await conn.query(
    `INSERT INTO Support_request
       (User_id, Volunteer_id, Category_id, Description, Preferred_date, Preferred_time, Support_mode, Request_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
    [d.userId, d.volunteerId || null, d.categoryId, d.description, d.preferredDate, d.preferredTime, d.supportMode]
  );
  return result.insertId;
}

/** Picks a volunteer and puts the request back to Pending. `refreshTimestamp` moves it to the top of the inbox. */
async function setVolunteer(conn, id, volunteerRecordId, { refreshTimestamp = false } = {}) {
  const [result] = await conn.query(
    `UPDATE Support_request
     SET Volunteer_id = ?, Request_status = 'Pending',
         created_at = IF(?, CURRENT_TIMESTAMP, created_at)
     WHERE Request_id = ?`,
    [volunteerRecordId, refreshTimestamp ? 1 : 0, id]
  );
  return result.affectedRows === 1;
}

async function setStatus(conn, id, status) {
  const [result] = await conn.query(
    'UPDATE Support_request SET Request_status = ? WHERE Request_id = ?',
    [status, id]
  );
  return result.affectedRows === 1;
}

/** The student edits the request: it goes back to Pending with no volunteer. */
async function updateCriteria(conn, id, d) {
  const [result] = await conn.query(
    `UPDATE Support_request
     SET Category_id = ?, Description = ?, Preferred_date = ?, Preferred_time = ?, Support_mode = ?,
         Request_status = 'Pending', Volunteer_id = NULL
     WHERE Request_id = ?`,
    [d.categoryId, d.description, d.preferredDate, d.preferredTime, d.supportMode, id]
  );
  return result.affectedRows === 1;
}

module.exports = { toRequest, findRequest, insertRequest, setVolunteer, setStatus, updateCriteria };
