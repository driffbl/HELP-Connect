import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-volunteer-profile',
  imports: [CommonModule, FormsModule, RouterLink, Header],
  templateUrl: './volunteer-profile.html',
  styleUrl: './volunteer-profile.css',
})
export class VolunteerProfile implements OnInit {
  private api = inject(Api);

  loading = signal(true);
  error = signal('');
  success = signal('');
  isEditing = signal(false);

  // Data
  volunteer = signal<any>(null);
  categories = signal<{ Category_id: number; Category_name: string }[]>([]);
  skills = signal<{ Skills_id: number; Skill_name: string }[]>([]);
  
  // Form state
  editForm = { availability: '', preferred_mode: 'Both', bio: '' };
  selectedCategories = signal<number[]>([]);
  selectedSkills = signal<number[]>([]);

  ngOnInit() {
    this.loadProfile();
    this.api.listCategories().subscribe((res: any) => this.categories.set(res.categories));
    this.api.listSkills().subscribe((res: any) => this.skills.set(res.skills));
  }

  loadProfile() {
    this.loading.set(true);
    this.api.getVolunteerProfile().subscribe({
      next: (res: any) => {
        this.volunteer.set(res.volunteer);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Failed to load profile.');
        this.loading.set(false);
      },
    });
  }

  startEditing() {
    const v = this.volunteer();
    this.editForm.availability = v.Availability;
    this.editForm.preferred_mode = v.Preferred_Mode;
    this.editForm.bio = v.Bio || '';
    this.selectedCategories.set(v.categories.map((c: any) => c.Category_id));
    this.selectedSkills.set(v.skills.map((s: any) => s.Skills_id));
    this.isEditing.set(true);
    this.success.set('');
  }

  cancelEditing() {
    this.isEditing.set(false);
  }

  toggleCategory(id: number) {
    const current = this.selectedCategories();
    this.selectedCategories.set(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  }
  isSelected(id: number) { return this.selectedCategories().includes(id); }

  toggleSkill(id: number) {
    const current = this.selectedSkills();
    this.selectedSkills.set(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  }
  isSkillSelected(id: number) { return this.selectedSkills().includes(id); }

  saveChanges() {
    this.error.set('');
    this.success.set('');

    this.api.updateVolunteer({
      availability: this.editForm.availability,
      preferred_mode: this.editForm.preferred_mode,
      bio: this.editForm.bio,
      category_ids: this.selectedCategories(),
      skill_ids: this.selectedSkills()
    }).subscribe({
      next: () => {
        this.success.set('Profile updated successfully!');
        this.isEditing.set(false);
        this.loadProfile(); // Reload to get fresh data
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Update failed.');
      }
    });
  }
}