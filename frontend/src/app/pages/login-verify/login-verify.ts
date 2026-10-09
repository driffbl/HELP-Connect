import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../services/api';

@Component({
  selector: 'app-login-verify',
  imports: [CommonModule, FormsModule],
  templateUrl: './login-verify.html',
  styleUrl: './login-verify.css',
})
export class LoginVerify {
  private api = inject(Api);
  private router = inject(Router);

  email = localStorage.getItem('pendingEmail') || '';
  code = '';
  error = '';
  loading = false;

  onSubmit() {
    this.error = '';
    this.loading = true;

    this.api.loginVerify({ email: this.email, code: this.code }).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.removeItem('pendingEmail');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Login verification failed.';
        this.loading = false;
      },
    });
  }
}
