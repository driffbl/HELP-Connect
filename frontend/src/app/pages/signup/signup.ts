import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterLink, Header],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  private api = inject(Api);
  private router = inject(Router);

  form = { name: '', email: '', password: '' };
  error = '';
  loading = false;

  onSubmit() {
    this.error = '';

    // ── Client-side validation ──
    if (!this.form.name.trim()) {
      this.error = 'Please enter your full name.';
      return;
    }

    if (this.form.name.trim().length < 2) {
      this.error = 'Name must be at least 2 characters.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email)) {
      this.error = 'Please enter a valid email address (e.g., name@help.edu.my).';
      return;
    }

    if (this.form.password.length < 8) {
      this.error = 'Password must be at least 8 characters long.';
      return;
    }

    // ── Server request ──
    this.loading = true;

    this.api.register(this.form).subscribe({
      next: () => {
        localStorage.setItem('pendingEmail', this.form.email);
        this.router.navigate(['/verify']);
      },
      error: (err: any) => {
        // Handle different server error types
        if (err.status === 0) {
          this.error = 'Cannot reach server. Please check your connection.';
        } else if (err.status === 400) {
          this.error = err.error?.message || 'Invalid input. Please check your details.';
        } else if (err.status === 500) {
          this.error = 'Server error. Please try again in a moment.';
        } else {
          this.error = err.error?.message || 'Registration failed. Please try again.';
        }
        this.loading = false;
      },
    });
  }

  // Clear error when user types
  clearError() {
    this.error = '';
  }
}