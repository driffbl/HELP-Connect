import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatchingService } from '../../services/matching.service';

export interface StudentRequestItem {
  request_id: number | string;
  title: string;
  category: string;
  description: string;
  volunteer_name: string;
  created_at: string;
  support_mode: string;
  status: 'Pending' | 'Accepted' | 'Cancelled' | 'Rejected';
}

@Component({
  selector: 'app-student-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-request.html',
  styleUrls: ['./student-request.css'],
})
export class StudentRequests implements OnInit {
  requests: StudentRequestItem[] = [];
  isLoading: boolean = false;
  studentId: number = 1; // Current test student ID
  currentSystemDate: Date = new Date(); // Compares against current time

  constructor(
    private matchingService: MatchingService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadStudentRequests();
  }

  loadStudentRequests(): void {
    this.isLoading = true;
    this.matchingService.getStudentRequests(this.studentId).subscribe({
      next: (data: any[]) => {
        // Map database attributes so req.title and other template bindings are satisfied
        this.requests = data.map((item) => ({
          request_id: item.request_id || item.Request_id,
          title: item.category || item.Category_name || 'Support Request',
          category: item.category || item.Category_name,
          description: item.description || item.Description,
          volunteer_name: item.volunteer_name || item.Volunteer_name || 'Unassigned',
          created_at: item.created_at || new Date().toISOString(),
          support_mode: item.support_mode || item.Support_mode,
          status: item.status || item.Request_status || 'Pending',
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading student requests:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Resolves: Property 'formatDate' does not exist on type 'StudentRequests'
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  // Resolves: Property 'isStalePending' does not exist on type 'StudentRequests'
  isStalePending(req: StudentRequestItem): boolean {
    if (req.status !== 'Pending') {
      return false;
    }
    const createdDate = new Date(req.created_at);
    const diffTime = Math.abs(this.currentSystemDate.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 3; // True if pending for more than 3 days
  }

  // Alternative Flow 6a: Re-select volunteer
  onChangeVolunteer(req: StudentRequestItem): void {
    this.router.navigate(['/matching-results'], {
      queryParams: {
        category: req.category,
        mode: req.support_mode,
        requestId: req.request_id,
      },
    });
  }

  onGoBack(): void {
    window.history.back();
  }
}
