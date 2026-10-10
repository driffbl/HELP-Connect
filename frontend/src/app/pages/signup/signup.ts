import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterLink],
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
    this.loading = true;

    this.api.register(this.form).subscribe({
      next: () => {
        localStorage.setItem('pendingEmail', this.form.email);
        this.router.navigate(['/verify']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Registration failed.';
        this.loading = false;
      },
    });
  }
}