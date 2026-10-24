import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Header } from '../../components/header/header';
import { Api } from '../../services/api';

@Component      ({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, Header],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  user = JSON.parse(localStorage.getItem('user') || '{}');
  userName = this.user.User_name || 'Student';
  userEmail = this.user.Email || '';
  
  // 1. Change to a signal
  isVolunteer = signal(false);
  private api = inject(Api);

  ngOnInit() {
    this.api.getVolunteerProfile().subscribe({
      next: () => { this.isVolunteer.set(true); },   // 2. Use .set()
      error: () => { this.isVolunteer.set(false); }
    });
  }
}
