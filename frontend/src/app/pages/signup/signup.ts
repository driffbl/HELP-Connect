import { Component, inject, signal } from '@angular/core';
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

  form = { name: '', email: '', password: '', confirmPassword: '' };
  
  error = signal('');
  loading = signal(false);
  showPassword = false;
showConfirmPassword = false;

  onSubmit() {
    this.error.set('');

    if (!this.form.name.trim()) {
      this.error.set('Please enter your full name.');
      return;
    }
    if (this.form.name.trim().length < 2) {
      this.error.set('Name must be at least 2 characters.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }
    if (this.form.password.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    if (this.form.password !== this.form.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);

    this.api.register({
      name: this.form.name,
      email: this.form.email,
      password: this.form.password
    }).subscribe({
      next: () => {
        localStorage.setItem('pendingEmail', this.form.email);
        this.router.navigate(['/verify']);
      },
      error: (err: any) => {
        if (err.status === 0) {
          this.error.set('Cannot reach server. Please check your connection.');
        } else if (err.status === 400) {
          this.error.set(err.error?.message || 'Invalid input.');
        } else {
          this.error.set(err.error?.message || 'Registration failed.');
        }
        this.loading.set(false);
      },
    });
  }

  clearError() {
    this.error.set('');
  }
}