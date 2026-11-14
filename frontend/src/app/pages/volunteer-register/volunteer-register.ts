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

  categories = signal<{ Category_id: number; Category_name: string }[]>([]);
  skills = signal<{ Skills_id: number; Skill_name: string }[]>([]);
  
  selectedCategories = signal<number[]>([]);
  selectedSkills = signal<number[]>([]);

  // Availability arrays
  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  
  // Array of slots: { day, startTime, endTime }
  availabilitySlots = signal<{ day: string; startTime: string; endTime: string }[]>([
    { day: 'Monday', startTime: '14:00', endTime: '16:00' }
  ]);

  form = {
    preferred_mode: 'Both',
    bio: '',
  };

  error = signal('');
  loading = signal(false);

  ngOnInit() {
    this.api.listCategories().subscribe({
      next: (res: any) => this.categories.set(res.categories),
      error: () => this.error.set('Failed to load categories.'),
    });

    this.api.listSkills().subscribe({
      next: (res: any) => this.skills.set(res.skills),
      error: () => this.error.set('Failed to load skills.'),
    });
  }

  // --- Availability Functions ---
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

  // --- Toggles ---
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

  toggleSkill(id: number) {
    const current = this.selectedSkills();
    if (current.includes(id)) {
      this.selectedSkills.set(current.filter((x) => x !== id));
    } else {
      this.selectedSkills.set([...current, id]);
    }
  }

  isSkillSelected(id: number): boolean {
    return this.selectedSkills().includes(id);
  }

    onSubmit() {
    this.error.set('');

    // 1. Check for duplicate slots
    const slots = this.availabilitySlots();
    const seen = new Set<string>();
    
    for (let slot of slots) {
      // Create a unique string for this slot
      const slotString = `${slot.day} ${slot.startTime} - ${slot.endTime}`;
      
      if (seen.has(slotString)) {
        this.error.set(`Duplicate slot found: ${slotString}. Please remove or change it.`);
        return;
      }
      seen.add(slotString);
    }

    // 2. Validate start time vs end time
    for (let slot of slots) {
      if (slot.startTime >= slot.endTime) {
        this.error.set(`End time must be after start time for ${slot.day}.`);
        return;
      }
    }

    // 3. Existing validation
    if (slots.length === 0) {
      this.error.set('Please add at least one availability slot.');
      return;
    }

    if (this.selectedCategories().length === 0) {
      this.error.set('Please select at least one category.');
      return;
    }

    this.loading.set(true);

    this.api.registerVolunteer({
      availability: this.getFormattedAvailability(),
      preferred_mode: this.form.preferred_mode,
      bio: this.form.bio,
      category_ids: this.selectedCategories(),
      skill_ids: this.selectedSkills(),
    }).subscribe({
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