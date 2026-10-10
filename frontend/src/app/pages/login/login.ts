import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
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
    this.loading = true;

    this.api.login(this.form).subscribe({
      next: () => {
        localStorage.setItem('pendingEmail', this.form.email);
        this.router.navigate(['/login-verify']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Login failed.';
        this.loading = false;
      },
    });
  }
}
