import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterLink, Header],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private api = inject(Api);
  private router = inject(Router);

  email = '';
  error = signal('');
  loading = signal(false);

  onSubmit() {
    this.error.set('');

    if (!this.email.trim()) {
      this.error.set('Please enter your email.');
      return;
    }

    this.loading.set(true);

    this.api.forgotPassword({ email: this.email }).subscribe({
      next: () => {
        localStorage.setItem('resetEmail', this.email);
        this.router.navigate(['/reset-password']);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Failed to send reset code.');
        this.loading.set(false);
      },
    });
  }
}