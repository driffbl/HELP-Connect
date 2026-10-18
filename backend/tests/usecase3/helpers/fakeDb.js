const { toSqlDateTime } = require('../../../src/utils/dateFormat');

/**
 * An in-memory stand-in for the repositories + transaction, with the same rules the real database enforces:
 *  - one Pending/Scheduled session per volunteer per slot (ER_DUP_ENTRY, like the UNIQUE key)
 *  - one review per session (ER_DUP_ENTRY)
 *  - a failed transaction is rolled back
 * It is NOT MySQL. The real SQL is checked by scripts/smoke-usecase3.js.
 */
function createFakeDb(startAt = '2026-10-20T09:00:00') {
  let current = new Date(startAt);
  const state = { volunteers: [], users: [], sessions: [], feedback: [], notes: [], requests: [], ids: { session: 0, feedback: 0, note: 0, request: 0 } };

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const dup = () => Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
  const userName = (id) => state.users.find((u) => u.id === id).name;

  function view(row) {
    const fb = state.feedback.find((f) => f.sessionId === row.id);
    return clone({
      id: row.id,
      studentId: row.studentId,
      studentName: userName(row.studentId),
      volunteerId: row.volunteerId,
      volunteerName: userName(row.volunteerId),
      title: row.title,
      description: row.description ?? null,
      category: row.category,
      date: row.date,
      time: row.time,
      mode: row.mode,
      status: row.status,
      proposedBy: row.proposedBy,
      requestId: row.requestId ?? null,
      requestStatus: row.requestId == null ? null : (state.requests.find((r) => r.id === row.requestId) || {}).status ?? null,
      createdAt: row.createdAt,
      review: fb
        ? { id: fb.id, sessionId: row.id, studentId: row.studentId, volunteerId: row.volunteerId, rating: fb.rating, comment: fb.comment, createdAt: fb.createdAt }
        : null,
    });
  }

  const isActive = (s) => s.status === 'Pending' || s.status === 'Scheduled';

  const sessions = {
    async findById(_c, id) {
      const row = state.sessions.find((s) => s.id === id);
      return row ? view(row) : null;
    },
    async listForUser(_c, userId, role) {
      return state.sessions
        .filter((s) => (role === 'student' ? s.studentId === userId : role === 'volunteer' ? s.volunteerId === userId : s.studentId === userId || s.volunteerId === userId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
        .map(view);
    },
    async findStalePending(_c, nowSql) {
      return state.sessions.filter((s) => s.status === 'Pending' && `${s.date} ${s.time}:00` <= nowSql).map(view);
    },
    async setStatus(_c, id, from, to, { clearProposer = false } = {}) {
      const row = state.sessions.find((s) => s.id === id);
      if (!row || row.status !== from) return false;
      row.status = to;
      if (clearProposer) row.proposedBy = null;
      return true;
    },
    async insertSession(_c, d) {
      const clash = state.sessions.some((s) => isActive(s) && s.volunteerId === d.volunteerId && s.date === d.date && s.time === d.time);
      if (clash) throw dup();
      const id = ++state.ids.session;
      state.sessions.push({ id, studentId: d.studentId, volunteerId: d.volunteerId, title: d.title, category: d.category, date: d.date, time: d.time, mode: d.mode, status: 'Pending', proposedBy: 'student', createdAt: current.toISOString() });
      return id;
    },
    async findByRequestId(_c, requestId) {
      const row = state.sessions.find((s) => s.requestId === requestId);
      return row ? view(row) : null;
    },
    async insertFromRequest(_c, d) {
      const clash = state.sessions.some((s) => isActive(s) && s.volunteerId === d.volunteerId && s.date === d.date && s.time === d.time);
      if (clash || state.sessions.some((s) => s.requestId === d.requestId)) throw dup();
      const id = ++state.ids.session;
      state.sessions.push({ id, requestId: d.requestId, studentId: d.studentId, volunteerId: d.volunteerId, title: d.title, description: d.description, category: d.category, date: d.date, time: d.time, mode: d.mode, status: 'Pending', proposedBy: 'student', createdAt: current.toISOString() });
      return id;
    },
    async reopenFromRequest(_c, id, d) {
      const row = state.sessions.find((s) => s.id === id);
      if (!row || !(row.status === 'Pending' || row.status === 'Cancelled')) return false;
      const clash = state.sessions.some((s) => s.id !== id && isActive(s) && s.volunteerId === d.volunteerId && s.date === d.date && s.time === d.time);
      if (clash) throw dup();
      Object.assign(row, { studentId: d.studentId, volunteerId: d.volunteerId, title: d.title, description: d.description, category: d.category, date: d.date, time: d.time, mode: d.mode, status: 'Pending', proposedBy: 'student' });
      return true;
    },
    async syncRequestStatus(_c, requestId, status) {
      if (requestId === null || requestId === undefined) return false;
      const r = state.requests.find((x) => x.id === requestId);
      if (!r) return false;
      r.status = status;
      return true;
    },
    async insertFeedback(_c, d) {
      if (state.feedback.some((f) => f.sessionId === d.sessionId)) throw dup();
      const id = ++state.ids.feedback;
      state.feedback.push({ id, sessionId: d.sessionId, rating: d.rating, comment: d.comment, createdAt: current.toISOString() });
      return id;
    },
    async findUser(_c, id) {
      const u = state.users.find((x) => x.id === id);
      return u ? { id: u.id, name: u.name, status: u.status } : null;
    },
    async ratingSummary(_c, volunteerId) {
      const mine = state.feedback.filter((f) => state.sessions.find((s) => s.id === f.sessionId).volunteerId === volunteerId);
      return { average: mine.length ? mine.reduce((a, f) => a + f.rating, 0) / mine.length : null, count: mine.length };
    },
  };

  /** Stand-in for requestRepository: the Support_request rows of Use Case 2. */
  const requests = {
    async insertRequest(_c, d) {
      const id = ++state.ids.request;
      state.requests.push({ id, userId: d.userId, volunteerRecordId: d.volunteerId || null, category: d.categoryName || 'Academic Support', description: d.description, date: d.preferredDate, timeText: d.preferredTime, mode: d.supportMode, status: 'Pending' });
      return id;
    },
    async findRequest(_c, id) {
      const r = state.requests.find((x) => x.id === id);
      if (!r) return null;
      const vol = state.volunteers.find((v) => v.recordId === r.volunteerRecordId);
      return clone({ id: r.id, studentId: r.userId, studentName: userName(r.userId), volunteerRecordId: r.volunteerRecordId, volunteerUserId: vol ? vol.userId : null, category: r.category, description: r.description, date: r.date, timeText: r.timeText, mode: r.mode, status: r.status });
    },
    async setVolunteer(_c, id, volunteerRecordId) {
      const r = state.requests.find((x) => x.id === id);
      if (!r) return false;
      r.volunteerRecordId = volunteerRecordId;
      r.status = 'Pending';
      return true;
    },
    async setStatus(_c, id, status) {
      const r = state.requests.find((x) => x.id === id);
      if (!r) return false;
      r.status = status;
      return true;
    },
    async updateCriteria(_c, id, d) {
      const r = state.requests.find((x) => x.id === id);
      if (!r) return false;
      Object.assign(r, { description: d.description, date: d.preferredDate, timeText: d.preferredTime, mode: d.supportMode, status: 'Pending', volunteerRecordId: null });
      return true;
    },
  };

  const notifications = {
    async insert(_c, { userId, sessionId, message }) {
      const id = ++state.ids.note;
      state.notes.push({ id, userId, sessionId, message, status: 'Unread', createdAt: current.toISOString() });
      return id;
    },
    async listForUser(_c, userId) {
      return state.notes.filter((n) => n.userId === userId).sort((a, b) => b.id - a.id).map((n) => ({ id: n.id, sessionId: n.sessionId, message: n.message, status: n.status, createdAt: n.createdAt }));
    },
    async countUnread(_c, userId) {
      return state.notes.filter((n) => n.userId === userId && n.status === 'Unread').length;
    },
    async markRead(_c, userId, id) {
      const n = state.notes.find((x) => x.id === id && x.userId === userId);
      if (n) n.status = 'Read';
      return !!n;
    },
    async markAllRead(_c, userId) {
      const unread = state.notes.filter((n) => n.userId === userId && n.status === 'Unread');
      unread.forEach((n) => (n.status = 'Read'));
      return unread.length;
    },
  };

  /** Like withTransaction: if the work throws, every change it made is undone. */
  async function tx(work) {
    const snapshot = clone(state);
    try {
      return await work({});
    } catch (err) {
      Object.keys(snapshot).forEach((k) => (state[k] = snapshot[k]));
      throw err;
    }
  }

  return {
    state,
    sessions,
    requests,
    notifications,
    tx,
    now: () => new Date(current),
    setNow(text) { current = new Date(text); },
    addUser(id, name, status = 'Active') { state.users.push({ id, name, status }); },
    /** A row of the Volunteer table: recordId is the Volunteer id Law's requests store, userId is the User id. */
    addVolunteer(recordId, userId) { state.volunteers.push({ recordId, userId }); },
    notesFor(userId) { return state.notes.filter((n) => n.userId === userId).map((n) => n.message); },
    nowSql: () => toSqlDateTime(current),
  };
}

module.exports = { createFakeDb };
