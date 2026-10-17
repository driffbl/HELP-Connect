const { HttpError } = require('../utils/httpError');

function createNotificationService({ notifications, tx }) {
  async function list(userId) {
    return tx(async (conn) => ({
      notifications: await notifications.listForUser(conn, userId),
      unread: await notifications.countUnread(conn, userId),
    }));
  }

  async function markRead(userId, id) {
    return tx(async (conn) => {
      const found = await notifications.markRead(conn, userId, id);
      if (!found) throw new HttpError(404, 'Notification not found.');
      return { id, status: 'Read' };
    });
  }

  async function markAllRead(userId) {
    return tx(async (conn) => ({ updated: await notifications.markAllRead(conn, userId) }));
  }

  return { list, markRead, markAllRead };
}

const notificationRepository = require('../repositories/notificationRepository');
const withTransaction = require('../utils/withTransaction');

module.exports = {
  createNotificationService,
  notificationService: createNotificationService({
    notifications: notificationRepository,
    tx: withTransaction,
  }),
};
