import { Component, OnInit, inject } from '@angular/core';
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

  volunteer: any = null;
  error = '';
  loading = true;

  ngOnInit() {
    this.api.getVolunteerProfile().subscribe({
      next: (res: any) => {
        this.volunteer = res.volunteer;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Could not load volunteer profile.';
        this.loading = false;
      },
    });
  }
}