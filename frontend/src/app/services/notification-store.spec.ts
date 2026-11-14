import { TestBed } from '@angular/core/testing';
import { AppNotification } from '../models/notification.model';
import { NotificationApi } from './notification-api';
import { NotificationStore } from './notification-store';

const note = (id: number, status: 'Unread' | 'Read'): AppNotification => ({
  id, sessionId: 1, message: `m${id}`, status, createdAt: '2026-10-20T10:00:00Z',
});

describe('NotificationStore', () => {
  let api: { list: ReturnType<typeof vi.fn>; markRead: ReturnType<typeof vi.fn>; markAllRead: ReturnType<typeof vi.fn> };
  let store: NotificationStore;

  beforeEach(() => {
    api = {
      list: vi.fn().mockResolvedValue({ notifications: [note(1, 'Unread'), note(2, 'Unread'), note(3, 'Read')], unread: 2 }),
      markRead: vi.fn().mockResolvedValue(undefined),
      markAllRead: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: NotificationApi, useValue: api }] });
    store = TestBed.inject(NotificationStore);
  });

  it('refresh loads the list and unread count', async () => {
    await store.refresh();
    expect(store.items().length).toBe(3);
    expect(store.unread()).toBe(2);
    expect(store.status()).toBe('ready');
  });

  it('refresh failure keeps the old list and records the error', async () => {
    await store.refresh();
    api.list.mockRejectedValue(new Error('boom'));
    await store.refresh();
    expect(store.status()).toBe('error');
    expect(store.items().length).toBe(3);
    expect(store.error()).toBeTruthy();
  });

  it('markRead updates at once and calls the API', async () => {
    await store.refresh();
    await store.markRead(1);
    expect(store.items().find((n) => n.id === 1)?.status).toBe('Read');
    expect(store.unread()).toBe(1);
    expect(api.markRead).toHaveBeenCalledWith(1);
  });

  it('markRead ignores an already-read notification', async () => {
    await store.refresh();
    await store.markRead(3);
    expect(api.markRead).not.toHaveBeenCalled();
    expect(store.unread()).toBe(2);
  });

  it('markRead reloads when the server refuses', async () => {
    await store.refresh();
    api.markRead.mockRejectedValue(new Error('no'));
    await store.markRead(1);
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('markAllRead clears the count, and does nothing when none are unread', async () => {
    await store.refresh();
    await store.markAllRead();
    expect(store.unread()).toBe(0);
    expect(store.items().every((n) => n.status === 'Read')).toBe(true);
    await store.markAllRead();
    expect(api.markAllRead).toHaveBeenCalledTimes(1);
  });

  it('clear forgets everything', async () => {
    await store.refresh();
    store.clear();
    expect(store.items()).toEqual([]);
    expect(store.status()).toBe('idle');
  });
});
