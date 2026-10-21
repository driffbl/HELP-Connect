/**
 * Runs `work(conn)` inside one database transaction: everything inside it is saved together,
 * or none of it is. The pool is required lazily so this file can be loaded without a database.
 */
module.exports = async function withTransaction(work) {
  const db = require('../config/db');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    conn.release();
  }
};
