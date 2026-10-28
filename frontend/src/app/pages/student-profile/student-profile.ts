import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-student-profile',
  imports: [CommonModule, FormsModule, RouterLink, Header],
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.css',
})
export class StudentProfile implements OnInit {
  private api = inject(Api);

  user = signal<any>(null);
  error = signal('');
  success = signal('');
  loading = signal(true);
  isEditing = signal(false);

  editName = '';

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading.set(true);
    this.api.getProfile().subscribe({
      next: (res: any) => {
        this.user.set(res.user);
        this.editName = res.user.User_name;
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Failed to load profile.');
        this.loading.set(false);
      },
    });
  }

  startEditing() {
    this.editName = this.user().User_name;
    this.isEditing.set(true);
    this.success.set('');
  }

  cancelEditing() {
    this.isEditing.set(false);
  }

  saveChanges() {
    this.error.set('');
    this.success.set('');

    if (!this.editName.trim() || this.editName.trim().length < 2) {
      this.error.set('Name must be at least 2 characters.');
      return;
    }

    this.api.updateProfile({ name: this.editName.trim() }).subscribe({
      next: (res: any) => {
        this.success.set('Profile updated successfully!');
        this.user.set(res.user);
        this.isEditing.set(false);
        localStorage.setItem('user', JSON.stringify(res.user)); // update navbar
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Update failed.');
      }
    });
  }
}