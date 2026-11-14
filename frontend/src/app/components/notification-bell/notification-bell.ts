import { Component, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../models/notification.model';
import { NotificationStore } from '../../services/notification-store';
import { timeAgo } from '../../utils/time-ago';

/** A bell with an unread badge. Clicking it opens a dropdown of the newest notifications. */
@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell implements OnInit {
  protected store = inject(NotificationStore);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected open = signal(false);

  ngOnInit(): void {
    void this.store.refresh();
  }

  protected toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) void this.store.refresh(); // always show what is current when it opens
  }

  protected ago(n: AppNotification): string {
    return timeAgo(n.createdAt);
  }

  /** Reading a notification marks it read and takes the person to their sessions. */
  protected async select(n: AppNotification): Promise<void> {
    this.open.set(false);
    await this.store.markRead(n.id);
    void this.router.navigateByUrl('/sessions');
  }

  protected markAll(): void {
    void this.store.markAllRead();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }
}
