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
  editForm = { preferred_mode: 'Both', bio: '' };
  selectedCategories = signal<number[]>([]);
  selectedSkills = signal<number[]>([]);

  // Availability Multi-slot state
  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  availabilitySlots = signal<{ day: string; startTime: string; endTime: string }[]>([]);

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
    this.editForm.preferred_mode = v.Preferred_Mode;
    this.editForm.bio = v.Bio || '';
    this.selectedCategories.set(v.categories.map((c: any) => c.Category_id));
    this.selectedSkills.set(v.skills.map((s: any) => s.Skills_id));
    
    // Parse the availability string back into slots
    this.availabilitySlots.set([]);
    if (v.Availability) {
      const slots = v.Availability.split(', ');
      slots.forEach((slotStr: string) => {
        const parts = slotStr.split(' ');
        if (parts.length >= 4) {
          this.availabilitySlots.update(current => [...current, {
            day: parts[0],
            startTime: parts[1],
            endTime: parts[3]
          }]);
        }
      });
    }
    
    // If no slots found, add one default slot
    if (this.availabilitySlots().length === 0) {
      this.availabilitySlots.set([{ day: 'Monday', startTime: '14:00', endTime: '16:00' }]);
    }

    this.isEditing.set(true);
    this.success.set('');
  }

  cancelEditing() {
    this.isEditing.set(false);
  }

  addSlot() {
    this.availabilitySlots.set([
      ...this.availabilitySlots(),
      { day: 'Monday', startTime: '14:00', endTime: '16:00' }
    ]);
  }

  removeSlot(index: number) {
    const current = this.availabilitySlots();
    this.availabilitySlots.set(current.filter((_, i) => i !== index));
  }

  getFormattedAvailability(): string {
    return this.availabilitySlots()
      .map(slot => `${slot.day} ${slot.startTime} - ${slot.endTime}`)
      .join(', ');
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

    // NEW: Validation check for categories
    if (this.selectedCategories().length === 0) {
      this.error.set('Please select at least one support category.');
      return;
    }

    if (this.availabilitySlots().length === 0) {
      this.error.set('Please add at least one availability slot.');
      return;
    }

    this.api.updateVolunteer({
      availability: this.getFormattedAvailability(),
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