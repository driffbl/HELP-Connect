import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-verify',
  imports: [CommonModule, FormsModule, Header],
  templateUrl: './verify.html',
  styleUrl: './verify.css',
})
export class Verify implements OnInit {
  private api = inject(Api);
  private router = inject(Router);

  email = localStorage.getItem('pendingEmail') || '';
  code = '';
  
  error = signal('');
  success = signal('');
  loading = signal(false);
  resending = signal(false);

  ngOnInit() {
    // FIX: If there is no email, redirect back to signup
    if (!this.email) {
      this.router.navigate(['/signup']);
    }
  }

  onSubmit() {
    this.error.set('');
    this.success.set('');

    if (!/^\d{6}$/.test(this.code)) {
      this.error.set('Please enter a valid 6-digit code.');
      return;
    }

    this.loading.set(true);

    this.api.verifyOTP({ email: this.email, code: this.code }).subscribe({
      next: () => {
        this.success.set('Account verified! Redirecting to login...');
        localStorage.removeItem('pendingEmail');
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err: any) => {
        if (err.status === 0) {
          this.error.set('Cannot reach server.');
        } else if (err.status === 400) {
          this.error.set(err.error?.message || 'Invalid or expired code.');
        } else {
          this.error.set(err.error?.message || 'Verification failed.');
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
        this.success.set('A new code has been sent to your email!');
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