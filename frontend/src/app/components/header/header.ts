import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  isLoggedIn = !!localStorage.getItem('token');
  notifications: any[] = [];
  unreadCount: number = 0;
  showDropdown: boolean = false;
  private pollSub?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = !!localStorage.getItem('token');
    if (this.isLoggedIn) {
      this.fetchNotifications();
      // Auto-refresh notifications every 15 seconds
      this.pollSub = interval(15000).subscribe(() => this.fetchNotifications());
    }
  }

  ngOnDestroy(): void {
    if (this.pollSub) this.pollSub.unsubscribe();
  }

  fetchNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        this.notifications = res.notifications || [];
        this.unreadCount = res.unread || 0;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load notifications:', err),
    });
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.fetchNotifications();
    }
  }

  // Close dropdown when clicking anywhere outside the header
  @HostListener('document:click')
  closeDropdown(): void {
    this.showDropdown = false;
  }

  onMarkAllRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.notifications.forEach((n: any) => {
          n.status = 'Read';
          n.Notification_status = 'Read';
        });
        this.unreadCount = 0;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to mark all notifications read:', err),
    });
  }

  onNotificationClick(item: any, event: Event): void {
    event.stopPropagation();
    const status = item.status || item.Notification_status;
    const id = item.id || item.Notification_id;

    if (status === 'Unread' && id) {
      this.notificationService.markRead(id).subscribe({
        next: () => {
          item.status = 'Read';
          item.Notification_status = 'Read';
          if (this.unreadCount > 0) this.unreadCount--;
          this.cdr.detectChanges();
        },
      });
    }

    this.showDropdown = false;

    const msg = (item.message || item.Message || '').toLowerCase();
    const sessionId = item.sessionId || item.Session_id;

    if (msg.includes('requested') || msg.includes('withdrawn')) {
      this.router.navigate(['/volunteer-inbox']);
    } else if (msg.includes('rejected') || msg.includes('declined')) {
      this.router.navigate(['/student-requests']);
    } else if (sessionId) {
      this.router.navigate(['/sessions']);
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
}
