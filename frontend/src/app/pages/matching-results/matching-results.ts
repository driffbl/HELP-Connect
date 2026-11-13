import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchingService } from '../../services/matching.service';
import { Volunteer } from '../../models/volunteer.model';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-matching-results',
  standalone: true,
  imports: [CommonModule, FormsModule, Header],
  templateUrl: './matching-results.html',
  styleUrls: ['./matching-results.css'],
})
export class MatchingResults implements OnInit {
  rawVolunteers: Volunteer[] = [];
  displayedVolunteers: Volunteer[] = [];
  availableSkills: string[] = [];

  isLoading: boolean = true;

  // Search parameters
  searchCategory: string = '';
  searchDescription: string = '';
  searchMode: string = '';
  searchDate: string = '';
  searchTime: string = '';
  requestId: number | null = null;
  previousVolunteerId: number | null = null;

  // Filter & Sort State (Iteration 2)
  selectedSkill: string = '';
  selectedSort: string = 'rating_desc'; // Default: Highest Rated

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
      this.previousVolunteerId = params['previousVolunteerId']
        ? Number(params['previousVolunteerId'])
        : null;

      if (!this.searchCategory || !this.searchMode) {
        this.router.navigate(['/request-support']);
        return;
      }

      this.loadSkills();
      this.fetchMatchingVolunteers();
    });
  }

  loadSkills(): void {
    this.matchingService.getSkillsByCategory(this.searchCategory).subscribe({
      next: (skills) => {
        this.availableSkills = skills.map((s) => s.Skill_name);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load category skills:', err),
    });
  }

  fetchMatchingVolunteers(): void {
    this.isLoading = true;
    this.matchingService
      .findVolunteers(this.searchCategory, this.searchMode, this.searchDate, this.searchTime)
      .subscribe({
        next: (data) => {
          let list = Array.isArray(data) ? data : [];

          // Alternative Flow 6a: Exclude previously rejected volunteer if reselecting
          if (this.requestId && this.previousVolunteerId) {
            list = list.filter((v) => v.volunteer_id !== this.previousVolunteerId);
          }

          this.rawVolunteers = list;
          this.applyFilterAndSort();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching volunteers:', err);
          this.rawVolunteers = [];
          this.displayedVolunteers = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // Iteration 2: Skill Filter & Sorting
  applyFilterAndSort(): void {
    let result = [...this.rawVolunteers];

    // 1. Skill Filtering
    if (this.selectedSkill) {
      result = result.filter(
        (v) =>
          v.skills_list && v.skills_list.toLowerCase().includes(this.selectedSkill.toLowerCase()),
      );
    }

    // 2. Sorting by Rating or Completed Sessions (User Story 6)
    if (this.selectedSort === 'rating_desc') {
      result.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (this.selectedSort === 'sessions_desc') {
      result.sort(
        (a, b) => (Number(b.completed_sessions) || 0) - (Number(a.completed_sessions) || 0),
      );
    }

    this.displayedVolunteers = result;
  }

  onFilterChange(): void {
    this.applyFilterAndSort();
  }

  onSortChange(): void {
    this.applyFilterAndSort();
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
    if (!this.selectedVolunteer) return;

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
            alert(err?.error?.message || 'Failed to update volunteer assignment.');
          },
        });
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const loggedInStudentId = Number(currentUser.User_id || currentUser.user_id || 1);
    const loggedInStudentName = currentUser.User_name || 'Student';

    const newRequestPayload = {
      student_id: loggedInStudentId,
      student_name: loggedInStudentName,
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
        alert(err?.error?.message || 'Database error creating request.');
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

  getSkillsArray(skillsString?: string): string[] {
    if (!skillsString) return [];
    return skillsString
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
