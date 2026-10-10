import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export interface DisplayVolunteer {
  volunteer_id: number;
  user_name: string;
  avatar_url: string;
  categories: string[];
  availability_notes: string;
  preferred_mode: string;
  rating: number;
  completed_sessions: number;
}

@Component({
  selector: 'app-matching-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './matching-results.html',
  styleUrls: ['./matching-results.css'],
})
export class MatchingResults implements OnInit {
  @Output() navigateBack = new EventEmitter<void>();

  volunteers: DisplayVolunteer[] = [];
  isLoading: boolean = true;

  // Modal States
  showReviewModal: boolean = false;
  showConfirmedModal: boolean = false;
  selectedVolunteer: DisplayVolunteer | null = null;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetchMatchingVolunteers();
  }

  fetchMatchingVolunteers(): void {
    this.isLoading = true;

    // test - Simulating system processing the support request criteria
    setTimeout(() => {
      this.volunteers = [
        {
          volunteer_id: 1,
          user_name: 'Alimah Smarts',
          avatar_url:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
          categories: ['Technology Support', 'Academic Support'],
          availability_notes: 'Tuesdays and Thursdays (12pm to 3pm)',
          preferred_mode: 'Virtual and Face to face',
          rating: 4.6,
          completed_sessions: 40,
        },
        {
          volunteer_id: 2,
          user_name: 'Jane Smith',
          avatar_url:
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80',
          categories: ['Technology Support', 'Academic Support'],
          availability_notes: 'Mondays and Thursdays (2pm to 3pm)',
          preferred_mode: 'Face to face only',
          rating: 4.5,
          completed_sessions: 14,
        },
      ];

      // TIP: Change to this.volunteers = [] to test the "No volunteer found" logic
      this.isLoading = false;
    }, 800);
  }

  // Triggered when clicking "Select Volunteer" on a card
  initiateSelection(volunteer: DisplayVolunteer): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedVolunteer = volunteer;
    this.showReviewModal = true;
    this.cdr.detectChanges();
  }

  // "View Other" / Cancel inside the first modal
  cancelSelection(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showReviewModal = false;
    this.selectedVolunteer = null;
    this.cdr.detectChanges();
  }

  // "Confirm" inside the first modal (FR19)[cite: 7]
  confirmSelection(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showReviewModal = false;
    this.showConfirmedModal = true;
    this.cdr.detectChanges();
  }

  // Acknowledging the final success pop-up
  closeConfirmedModal(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showConfirmedModal = false;
    this.selectedVolunteer = null;
    this.cdr.detectChanges();

    // Route to student dashboard / student-request tracking page[cite: 5, 6]
    this.router.navigate(['/student-request']).catch(() => {
      // Fallback if route does not exist yet
      this.navigateBack.emit();
    });
  }

  onChangeCriteria(): void {
    this.navigateBack.emit();
  }
}
