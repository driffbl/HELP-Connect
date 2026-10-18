/**
 * DEVELOPMENT ONLY. Puts a realistic set of sessions in the database between the two seeded test users,
 * so every Use Case 3 page has something to show. Creating a request has no screen yet.
 *
 *   cd backend
 *   node scripts/demo-sessions.js                         (between the two seeded test users)
 *   node scripts/demo-sessions.js student@x.y volunteer@x.y   (between two real, verified accounts)
 *
 * Safe to re-run: it first removes the sessions between these two test users (and their feedback and
 * notifications) and makes a fresh set. Dates are relative to now. Running scripts/smoke-usecase3.js
 * also clears these, so run this again afterwards.
 */
require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to add demo data when NODE_ENV is "production".');
  process.exit(1);
}

const db = require('../src/config/db');

const EMAILS = {
  student: process.argv[2] || 'student.test@helplive.edu.my',
  volunteer: process.argv[3] || 'volunteer.test@helplive.edu.my',
};

const pad = (n) => String(n).padStart(2, '0');
const sqlDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const sqlTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const sqlStamp = (d) => `${sqlDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const inMinutes = (n) => new Date(Date.now() + n * 60000);
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

// start = when the session is (or was) due; created = when the student asked for it.
const DEMO = [
  { title: 'Python Tutoring', category: 'Academic Support', start: inMinutes(2 * 1440), mode: 'Virtual', status: 'Pending', proposedBy: 'student', created: daysAgo(1) },
  { title: 'Laptop Setup Help', category: 'Technology Support', start: inMinutes(1440), mode: 'Face-to-Face', status: 'Scheduled', proposedBy: null, created: daysAgo(3) },
  { title: 'CV Review', category: 'Career Guidance', start: inMinutes(-60), mode: 'Virtual', status: 'Scheduled', proposedBy: null, created: daysAgo(4) }, // already started: the volunteer can complete it
  { title: 'Cloud Computing Tutoring', category: 'Academic Support', start: inMinutes(-3 * 1440), mode: 'Virtual', status: 'Completed', proposedBy: null, created: daysAgo(8), review: { rating: 5, comment: 'Very clear explanations.' } },
  { title: 'Stress Management Chat', category: 'Wellbeing', start: inMinutes(-2 * 1440), mode: 'Virtual', status: 'Cancelled', proposedBy: null, created: daysAgo(9) },
  { title: 'Wi-Fi Troubleshooting', category: 'Technology Support', start: inMinutes(-90), mode: 'Virtual', status: 'Pending', proposedBy: 'student', created: daysAgo(2) }, // nobody answered in time: the server cancels it on the first load
  { title: 'Java Debugging', category: 'Academic Support', start: inMinutes(-1440), mode: 'Virtual', status: 'Completed', proposedBy: null, created: daysAgo(5) }, // completed, no feedback yet: the student can rate it
  { title: 'Resume Workshop', category: 'Career Guidance', start: inMinutes(-6 * 1440), mode: 'Face-to-Face', status: 'Completed', proposedBy: null, created: daysAgo(12), review: { rating: 4, comment: null } },
];

async function main() {
  const ids = {};
  for (const [role, email] of Object.entries(EMAILS)) {
    const [rows] = await db.query("SELECT User_id FROM User WHERE Email = ? AND Account_status = 'Active'", [email]);
    if (rows.length === 0) {
      console.error(`Test user ${email} was not found. Run database/usecase3_seed.sql first.`);
      return 1;
    }
    ids[role] = rows[0].User_id;
  }

  await db.query('DELETE FROM Support_session WHERE Student_user_id = ? AND Volunteer_user_id = ?', [ids.student, ids.volunteer]);

  for (const d of DEMO) {
    const [result] = await db.query(
      `INSERT INTO Support_session
         (Student_user_id, Volunteer_user_id, Title, Category, Session_date, Session_time,
          Support_mode, Session_status, Proposed_by, Created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ids.student, ids.volunteer, d.title, d.category, sqlDate(d.start), sqlTime(d.start), d.mode, d.status, d.proposedBy, sqlStamp(d.created)]
    );
    if (d.review) {
      await db.query('INSERT INTO Feedback (Session_id, Rating, Comments, Created_at) VALUES (?, ?, ?, ?)', [
        result.insertId, d.review.rating, d.review.comment, sqlStamp(d.start),
      ]);
    }
    console.log(`  added  ${d.status.padEnd(9)} ${d.title}`);
  }

  console.log(`\nDone: ${DEMO.length} sessions between ${EMAILS.student} (student) and ${EMAILS.volunteer} (volunteer).`);
  return 0;
}

main()
  .then(async (code) => { await db.end(); process.exit(code); })
  .catch(async (err) => { console.error('Could not add demo sessions:', err.message); try { await db.end(); } catch { /* ignore */ } process.exit(1); });
