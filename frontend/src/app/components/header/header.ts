import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationBell } from '../notification-bell/notification-bell';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, NotificationBell],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  isLoggedIn = !!localStorage.getItem('token');

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
}
