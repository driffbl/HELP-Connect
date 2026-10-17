import { Component, inject } from '@angular/core';
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
export class Verify {
  private api = inject(Api);
  private router = inject(Router);

  email = localStorage.getItem('pendingEmail') || '';
  code = '';
  error = '';
  success = '';
  loading = false;

  onSubmit() {
    this.error = '';
    this.success = '';

    // Client-side validation: must be exactly 6 digits
    if (!/^\d{6}$/.test(this.code)) {
      this.error = 'Please enter a valid 6-digit code.';
      return;
    }

    this.loading = true;

    this.api.verifyOTP({ email: this.email, code: this.code }).subscribe({
      next: () => {
        this.success = 'Account verified! Redirecting to login...';
        localStorage.removeItem('pendingEmail');
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err: any) => {
        if (err.status === 0) {
          this.error = 'Cannot reach server. Please check your connection.';
        } else if (err.status === 404) {
          this.error = 'User not found. Please register again.';
        } else if (err.status === 400) {
          this.error = err.error?.message || 'Invalid or expired code.';
        } else {
          this.error = err.error?.message || 'Verification failed.';
        }
        this.loading = false;
      },
    });
  }

  clearError() {
    this.error = '';
  }
}
