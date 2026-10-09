import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../services/api';

@Component({
  selector: 'app-verify',
  imports: [CommonModule, FormsModule],
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
    this.loading = true;

    this.api.verifyOTP({ email: this.email, code: this.code }).subscribe({
      next: () => {
        this.success = 'Account verified! Redirecting to login...';
        localStorage.removeItem('pendingEmail');
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Verification failed.';
        this.loading = false;
      },
    });
  }
}
