import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, Header],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private api = inject(Api);
  private router = inject(Router);

  email = localStorage.getItem('resetEmail') || '';
  code = '';
  newPassword = '';
  error = signal('');
  success = signal('');
  loading = signal(false);

  onSubmit() {
    this.error.set('');
    this.success.set('');

    if (this.code.length !== 6) {
      this.error.set('Please enter the 6-digit code.');
      return;
    }
    if (this.newPassword.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }

    this.loading.set(true);

    this.api.resetPassword({ email: this.email, code: this.code, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.success.set('Password reset successfully! Redirecting to login...');
        localStorage.removeItem('resetEmail');
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Password reset failed.');
        this.loading.set(false);
      },
    });
  }
}