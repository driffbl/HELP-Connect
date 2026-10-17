import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-volunteer-profile',
  imports: [CommonModule, RouterLink, Header],
  templateUrl: './volunteer-profile.html',
  styleUrl: './volunteer-profile.css',
})
export class VolunteerProfile implements OnInit {
  private api = inject(Api);

  // THE FIX: These MUST be signals. Notice the signal() wrapper.
  volunteer = signal<any>(null);
  error = signal('');
  loading = signal(true);

  ngOnInit() {
    this.api.getVolunteerProfile().subscribe({
      next: (res: any) => {
        console.log('Profile loaded:', res);
        this.volunteer.set(res.volunteer);
        this.loading.set(false); // Notice the .set()
      },
      error: (err: any) => {
        console.log('Profile error:', err);
        this.error.set(err.error?.message || 'Could not load profile.');
        this.loading.set(false); // Notice the .set()
      },
    });
  }
}