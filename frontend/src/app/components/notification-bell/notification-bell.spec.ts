import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppNotification } from '../../models/notification.model';
import { NotificationStore } from '../../services/notification-store';
import { NotificationBell } from './notification-bell';

const note = (id: number, status: 'Unread' | 'Read'): AppNotification => ({
  id, sessionId: 1, message: `Message ${id}`, status, createdAt: new Date().toISOString(),
});

function setup(items: AppNotification[], unread: number) {
  const store = {
    items: signal(items),
    unread: signal(unread),
    status: signal<'idle' | 'loading' | 'ready' | 'error'>('ready'),
    error: signal<string | null>(null),
    refresh: vi.fn().mockResolvedValue(undefined),
    markRead: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    imports: [NotificationBell],
    providers: [provideRouter([]), { provide: NotificationStore, useValue: store }],
  });
  const fixture = TestBed.createComponent(NotificationBell);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  return { fixture, store, q, el };
}

describe('NotificationBell', () => {
  it('loads on start and shows the unread count badge', () => {
    const { store, q } = setup([note(1, 'Unread')], 1);
    expect(store.refresh).toHaveBeenCalled();
    expect(q('badge')?.textContent?.trim()).toBe('1');
    expect(q('panel')).toBeNull();
  });

  it('hides the badge when everything is read', () => {
    const { q } = setup([note(1, 'Read')], 0);
    expect(q('badge')).toBeNull();
  });

  it('opens the dropdown on click and lists the notifications', () => {
    const { fixture, q, el } = setup([note(1, 'Unread'), note(2, 'Read')], 1);
    q('bell')!.click();
    fixture.detectChanges();
    expect(q('panel')).not.toBeNull();
    expect(el.querySelectorAll('[data-testid="notif-item"]').length).toBe(2);
  });

  it('shows an empty message when there are none', () => {
    const { fixture, q } = setup([], 0);
    q('bell')!.click();
    fixture.detectChanges();
    expect(q('notif-empty')).not.toBeNull();
  });

  it('marks all as read', () => {
    const { fixture, q, store } = setup([note(1, 'Unread')], 1);
    q('bell')!.click();
    fixture.detectChanges();
    q('mark-all')!.click();
    expect(store.markAllRead).toHaveBeenCalled();
  });

  it('marks one read, closes, and goes to My Sessions when clicked', async () => {
    const { fixture, q, store } = setup([note(7, 'Unread')], 1);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    q('bell')!.click();
    fixture.detectChanges();
    q('notif-item')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(store.markRead).toHaveBeenCalledWith(7);
    expect(nav).toHaveBeenCalledWith('/sessions');
    expect(q('panel')).toBeNull();
  });

  it('closes when clicking outside', () => {
    const { fixture, q } = setup([note(1, 'Read')], 0);
    q('bell')!.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(q('panel')).toBeNull();
  });
});
