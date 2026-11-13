import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-login-verify',
  imports: [CommonModule, FormsModule, Header],
  templateUrl: './login-verify.html',
  styleUrl: './login-verify.css',
})
export class LoginVerify {
  private api = inject(Api);
  private router = inject(Router);

  email = localStorage.getItem('pendingEmail') || '';
  code = '';
  
  error = signal('');
  success = signal('');
  loading = signal(false);
  resending = signal(false);

  onSubmit() {
    this.error.set('');
    this.success.set('');

    if (!/^\d{6}$/.test(this.code)) {
      this.error.set('Please enter a valid 6-digit code.');
      return;
    }

    this.loading.set(true);

    this.api.loginVerify({ email: this.email, code: this.code }).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.removeItem('pendingEmail');
        window.location.href = '/dashboard';
      },
      error: (err: any) => {
        if (err.status === 0) {
          this.error.set('Cannot reach server. Please check your connection.');
        } else if (err.status === 404) {
          this.error.set('User not found.');
        } else if (err.status === 400) {
          this.error.set(err.error?.message || 'Invalid or expired code.');
        } else {
          this.error.set(err.error?.message || 'Login verification failed.');
        }
        this.loading.set(false);
      },
    });
  }

  resendCode() {
    this.error.set('');
    this.success.set('');
    this.resending.set(true);

    this.api.resendVerification({ email: this.email }).subscribe({
      next: () => {
        this.success.set('A new login code has been sent to your email!');
        this.resending.set(false);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Failed to resend code.');
        this.resending.set(false);
      }
    });
  }

  clearError() {
    this.error.set('');
  }
}