import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';
import { RouterLink } from '@angular/router'; // Make sure this is at the top

@Component({
  selector: 'app-student-profile',
  imports: [CommonModule, FormsModule, Header, RouterLink],
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.css',
})
export class StudentProfile implements OnInit {
  private api = inject(Api);

  user = signal<any>(null);
  name = '';
  error = signal('');
  success = signal('');
  loading = signal(true);

  ngOnInit() {
    this.api.getProfile().subscribe({
      next: (res: any) => {
        this.user.set(res.user);
        this.name = res.user.User_name;
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Failed to load profile.');
        this.loading.set(false);
      },
    });
  }

  onSubmit() {
    this.error.set('');
    this.success.set('');

    if (!this.name.trim() || this.name.trim().length < 2) {
      this.error.set('Name must be at least 2 characters.');
      return;
    }

    this.api.updateProfile({ name: this.name.trim() }).subscribe({
      next: (res: any) => {
        this.success.set('Profile updated successfully!');
        this.user.set(res.user);
        // Update the navbar by updating localStorage
        localStorage.setItem('user', JSON.stringify(res.user));
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Update failed.');
      },
    });
  }
}
