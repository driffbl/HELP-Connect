import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Header } from '../../components/header/header';
import { Api } from '../../services/api';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, Header],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  user: any = null;
  isVolunteer = signal(false); 
  
  private api = inject(Api);
  private router = inject(Router);

  ngOnInit() {
    const stored = localStorage.getItem('user');
    this.user = stored ? JSON.parse(stored) : null;

    if (this.user) {
      this.api.getVolunteerProfile().subscribe({
        next: () => { this.isVolunteer.set(true); },
        error: () => { this.isVolunteer.set(false); }
      });
    }
  }

  // New simple routing logic
  onVolunteerClick() {
    if (this.isVolunteer()) {
      this.router.navigate(['/volunteer/profile']);
    } else {
      this.router.navigate(['/volunteer/register']);
    }
  }

  showComingSoon() {
    alert('This feature will be available in the next update.');
  }
}