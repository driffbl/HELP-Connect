import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { Api } from '../../services/api'; // Added for volunteer check
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private api = inject(Api); // Inject API to check volunteer status

  isLoggedIn = !!localStorage.getItem('token');
  isVolunteer = signal(false); // Track if they are a volunteer
  
  notifications: any[] = [];
  unreadCount: number = 0;
  showDropdown: boolean = false;
  private pollSub?: Subscription;

  ngOnInit(): void {
    this.isLoggedIn = !!localStorage.getItem('token');
    
    if (this.isLoggedIn) {
      this.fetchNotifications();
      // Auto-refresh notifications every 15 seconds
      this.pollSub = interval(15000).subscribe(() => this.fetchNotifications());
      
      // Check if user is a volunteer to change the navbar link
      this.api.getVolunteerProfile().subscribe({
        next: () => this.isVolunteer.set(true),
        error: () => this.isVolunteer.set(false)
      });
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

    // Session notifications (request, accept, decline, cancel, complete) open My Sessions, where those
    // actions now live. Only notifications that carry no session fall back to the older request pages.
    if (sessionId) {
      this.router.navigate(['/sessions']);
    } else if (msg.includes('requested') || msg.includes('withdrawn')) {
      this.router.navigate(['/volunteer-inbox']);
    } else if (msg.includes('rejected') || msg.includes('declined')) {
      this.router.navigate(['/student-requests']);
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
}