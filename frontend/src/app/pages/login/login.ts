import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink, Header],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private api = inject(Api);
  private router = inject(Router);

  form = { email: '', password: '' };
  error = '';
  loading = false;

  onSubmit() {
    this.error = '';

    // ── Client-side validation ──
    if (!this.form.email.trim()) {
      this.error = 'Please enter your email.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email)) {
      this.error = 'Please enter a valid email address.';
      return;
    }

    if (!this.form.password) {
      this.error = 'Please enter your password.';
      return;
    }

    // ── Server request ──
    this.loading = true;

    this.api.login(this.form).subscribe({
      next: () => {
        localStorage.setItem('pendingEmail', this.form.email);
        this.router.navigate(['/login-verify']);
      },
      error: (err: any) => {
        if (err.status === 0) {
          this.error = 'Cannot reach server. Please check your connection.';
        } else if (err.status === 401) {
          this.error = 'Invalid email or password. Please try again.';
        } else if (err.status === 403) {
          this.error = 'Your account is not active. Please verify your email first.';
        } else if (err.status === 500) {
          this.error = 'Server error. Please try again in a moment.';
        } else {
          this.error = err.error?.message || 'Login failed. Please try again.';
        }
        this.loading = false;
      },
    });
  }

  clearError() {
    this.error = '';
  }
}