import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchingService } from '../../services/matching.service';
import { Volunteer } from '../../models/volunteer.model';

@Component({
  selector: 'app-matching-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './matching-results.html',
  styleUrls: ['./matching-results.css'],
})
export class MatchingResults implements OnInit {
  volunteers: Volunteer[] = [];
  isLoading: boolean = true;
  requestId: number | null = null;
  searchCategory: string = '';
  searchMode: string = '';
  searchDate: string = '';
  searchTime: string = '';

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
      this.searchMode = params['mode'] || '';
      this.searchDate = params['date'] || '';
      this.searchTime = params['time'] || '';

      if (!this.searchCategory || !this.searchMode) {
        console.warn('Missing search parameters. Redirecting to form...');
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
          console.log('API Volunteers Response:', data);
          this.volunteers = data;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching matching volunteers:', err);
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

  confirmSelection(event?: Event): void {
    if (event) event.stopPropagation();
    // User confirmed their choice: transition to confirmed popup
    this.showReviewModal = false;
    this.showConfirmedModal = true;
    this.cdr.detectChanges();
  }

  closeConfirmedModal(event?: Event): void {
    if (event) event.stopPropagation();
    this.showConfirmedModal = false;
    this.selectedVolunteer = null;
    this.cdr.detectChanges();

    // Navigate to student dashboard tracking view
    this.router.navigate(['/student-requests']);
  }

  onChangeCriteria(): void {
    this.router.navigate(['/request-support']);
  }
}
