/**
 * DEVELOPMENT ONLY. Makes login tokens for the two seeded test users (student.test@ and volunteer.test@)
 * and prints a link that signs the Angular app in as them.
 *
 *   cd backend
 *   node scripts/dev-token.js          (prints the link)
 *   node scripts/dev-token.js --copy   (prints it and puts it on the clipboard)
 *
 * Then open the link in Chrome or Edge. The tokens last 7 days, so re-run it when they expire.
 * Delete this script, and the dev-login page in the frontend, when the real login is merged.
 */
require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to make development tokens when NODE_ENV is "production".');
  process.exit(1);
}

const { spawnSync } = require('child_process');
const jwt = require('jsonwebtoken');
const db = require('../src/config/db');

const APP_URL = process.env.APP_URL || 'http://localhost:4200';
const EMAILS = {
  student: 'student.test@helplive.edu.my',
  volunteer: 'volunteer.test@helplive.edu.my',
};

/** Puts text on the clipboard on Windows or macOS. Returns false when that is not possible. */
function copyToClipboard(text) {
  const command = process.platform === 'win32' ? 'clip' : process.platform === 'darwin' ? 'pbcopy' : null;
  if (!command) return false;
  try {
    return spawnSync(command, { input: text }).status === 0;
  } catch {
    return false;
  }
}

async function main() {
  const tokens = {};
  for (const [role, email] of Object.entries(EMAILS)) {
    const [rows] = await db.query("SELECT User_id FROM User WHERE Email = ? AND Account_status = 'Active'", [email]);
    if (rows.length === 0) {
      console.error(`Test user ${email} was not found. Run database/usecase3_seed.sql first.`);
      return 1;
    }
    tokens[role] = jwt.sign({ User_id: rows[0].User_id, Email: email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
  }

  const link = `${APP_URL}/dev-login#student=${tokens.student}&volunteer=${tokens.volunteer}`;
  console.log('\nOpen this link in Chrome or Edge (it signs the app in as the two test users):\n');
  console.log(`${link}\n`);
  if (process.argv.includes('--copy')) {
    console.log(copyToClipboard(link) ? 'The link is on your clipboard: paste it into the browser address bar.\n' : 'Could not use the clipboard here. Copy the link above instead.\n');
  }
  console.log('The Student / Volunteer switch in the header then switches between them. The link works for 7 days.\n');
  return 0;
}

main()
  .then(async (code) => { await db.end(); process.exit(code); })
  .catch(async (err) => { console.error('Could not make tokens:', err.message); try { await db.end(); } catch { /* ignore */ } process.exit(1); });
