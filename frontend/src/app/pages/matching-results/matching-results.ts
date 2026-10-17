import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchingService } from '../../services/matching.service';
import { Volunteer } from '../../models/volunteer.model';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-matching-results',
  standalone: true,
  imports: [CommonModule, Header],
  templateUrl: './matching-results.html',
  styleUrls: ['./matching-results.css'],
})
export class MatchingResults implements OnInit {
  volunteers: Volunteer[] = [];
  isLoading: boolean = true;

  // Search parameters forwarded from the request form
  searchCategory: string = '';
  searchDescription: string = '';
  searchMode: string = '';
  searchDate: string = '';
  searchTime: string = '';
  requestId: number | null = null;

  showReviewModal: boolean = false;
  showConfirmedModal: boolean = false;
  selectedVolunteer: Volunteer | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchingService: MatchingService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.searchCategory = params['category'] || '';
      this.searchDescription = params['description'] || '';
      this.searchMode = params['mode'] || '';
      this.searchDate = params['date'] || '';
      this.searchTime = params['time'] || '';
      this.requestId = params['requestId'] ? Number(params['requestId']) : null;

      if (!this.searchCategory || !this.searchMode) {
        this.router.navigate(['/request-support']);
        return;
      }

      this.fetchMatchingVolunteers();
    });
  }

  fetchMatchingVolunteers(): void {
    this.isLoading = true;
    this.matchingService
      .findVolunteers(this.searchCategory, this.searchMode, this.searchDate, this.searchTime)
      .subscribe({
        next: (data) => {
          this.volunteers = Array.isArray(data) ? data : [];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching volunteers:', err);
          this.volunteers = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  initiateSelection(volunteer: Volunteer, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedVolunteer = volunteer;
    this.showReviewModal = true;
    this.cdr.detectChanges();
  }

  cancelSelection(event?: Event): void {
    if (event) event.stopPropagation();
    this.showReviewModal = false;
    this.selectedVolunteer = null;
    this.cdr.detectChanges();
  }

  // Phase 2: Creates the database record once a volunteer is confirmed
  confirmSelection(event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.selectedVolunteer) return;

    // Path A: Reselecting an alternative volunteer for an existing request
    if (this.requestId) {
      this.matchingService
        .assignVolunteer(this.requestId, this.selectedVolunteer.volunteer_id)
        .subscribe({
          next: () => {
            this.showReviewModal = false;
            this.showConfirmedModal = true;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error reassigning volunteer:', err);
            alert('Failed to update volunteer assignment in database.');
          },
        });
      return;
    }

    // Path B: Brand-new support request (Initial creation with chosen volunteer)
    const newRequestPayload = {
      student_id: 1, // Current logged-in student ID
      student_name: 'Wei Yang',
      volunteer_id: this.selectedVolunteer.volunteer_id,
      volunteer_name: this.selectedVolunteer.user_name,
      category: this.searchCategory as any,
      description: this.searchDescription,
      preferred_date: this.searchDate,
      preferred_time: this.searchTime,
      support_mode: this.searchMode as any,
      status: 'Pending' as const,
    };

    this.matchingService.createRequest(newRequestPayload).subscribe({
      next: () => {
        this.showReviewModal = false;
        this.showConfirmedModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to create support request:', err);
        alert('Database error creating request.');
      },
    });
  }

  closeConfirmedModal(event?: Event): void {
    if (event) event.stopPropagation();
    this.showConfirmedModal = false;
    this.selectedVolunteer = null;
    this.cdr.detectChanges();
    this.router.navigate(['/student-requests']);
  }

  // Returns to the form while preserving previous user inputs
  onGoBack(): void {
    if (this.requestId) {
      this.router.navigate(['/student-requests']);
    } else {
      this.onChangeCriteria();
    }
  }

  onChangeCriteria(): void {
    this.router.navigate(['/request-support'], {
      queryParams: {
        category: this.searchCategory,
        description: this.searchDescription,
        mode: this.searchMode,
        date: this.searchDate,
        time: this.searchTime,
      },
    });
  }
}
