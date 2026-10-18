import { Component, inject, signal } from '@angular/core';
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
  
  // 1. Change to signals
  error = signal('');
  loading = signal(false);

  onSubmit() {
    this.error.set('');

    if (!this.form.email.trim()) {
      this.error.set('Please enter your email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    if (!this.form.password) {
      this.error.set('Please enter your password.');
      return;
    }

    this.loading.set(true);

    this.api.login(this.form).subscribe({
      next: () => {
        localStorage.setItem('pendingEmail', this.form.email);
        this.router.navigate(['/login-verify']);
      },
      error: (err: any) => {
        if (err.status === 0) {
          this.error.set('Cannot reach server. Please check your connection.');
        } else if (err.status === 401) {
          this.error.set('Invalid email or password. Please try again.');
        } else if (err.status === 403) {
          this.error.set('Your account is not active. Please verify your email first.');
        } else {
          this.error.set(err.error?.message || 'Login failed. Please try again.');
        }
        this.loading.set(false); // 2. Notice the .set()
      },
    });
  }

  clearError() {
    this.error.set(''); // 3. Notice the .set()
  }
}