import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-volunteer-register',
  imports: [CommonModule, FormsModule, Header],
  templateUrl: './volunteer-register.html',
  styleUrl: './volunteer-register.css',
})
export class VolunteerRegister implements OnInit {
  private api = inject(Api);
  private router = inject(Router);

  // ── Signals ──
  categories = signal<{ Category_id: number; Category_name: string }[]>([]);
  selectedCategories = signal<number[]>([]);

  form = {
    availability: '',
    preferred_mode: 'Both',
    bio: '',
  };

  error = signal('');
  loading = signal(false);

  ngOnInit() {
    console.log('🟢 ngOnInit FIRED');

    this.api.listCategories().subscribe({
      next: (res: any) => {
        console.log('🟢 API RESPONSE:', res);
        this.categories.set(res.categories);
        console.log('🟢 categories.set called with', res.categories.length, 'items');
      },
      error: (err: any) => {
        console.log('🔴 API ERROR:', err);
        this.error.set('Failed to load categories.');
      },
    });
  }

  toggleCategory(id: number) {
    const current = this.selectedCategories();
    if (current.includes(id)) {
      this.selectedCategories.set(current.filter((x) => x !== id));
    } else {
      this.selectedCategories.set([...current, id]);
    }
  }

  isSelected(id: number): boolean {
    return this.selectedCategories().includes(id);
  }

  onSubmit() {
    this.error.set('');

    if (!this.form.availability.trim()) {
      this.error.set('Please enter your availability.');
      return;
    }
    if (this.selectedCategories().length === 0) {
      this.error.set('Please select at least one category.');
      return;
    }

    this.loading.set(true);

    this.api
      .registerVolunteer({
        availability: this.form.availability,
        preferred_mode: this.form.preferred_mode,
        bio: this.form.bio,
        category_ids: this.selectedCategories(),
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/volunteer/profile']);
        },
        error: (err: any) => {
          this.error.set(err.error?.message || 'Registration failed.');
          this.loading.set(false);
        },
      });
  }
}