import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StudentRequest {
  request_id: string;
  title: string;
  category: string;
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
  requests: StudentRequest[] = [];

  // Hardcoded to match the contextual current date (October 11, 2026) for accurate 3-day testing
  currentSystemDate = new Date('2026-10-11T00:00:00');

  ngOnInit(): void {
    this.loadStudentRequests();
  }

  loadStudentRequests(): void {
    // Simulating database fetch from SupportRequest table[cite: 14]
    this.requests = [
      {
        request_id: 'R4569',
        title: 'Python Tutoring',
        category: 'Academic Support',
        volunteer_name: 'Alex Tan',
        created_at: '2026-10-10T10:00:00', // Only 1 day ago (Will NOT show Change Volunteer)
        support_mode: 'Virtual',
        status: 'Pending',
      },
      {
        request_id: 'R4570',
        title: 'Discrete Math Help',
        category: 'Academic Support',
        volunteer_name: 'Sarah Lee',
        created_at: '2026-10-05T09:00:00', // 6 days ago (WILL show Change Volunteer)[cite: 9]
        support_mode: 'Face-to-Face',
        status: 'Pending',
      },
      {
        request_id: 'R4557',
        title: 'Cloud Computing Tutoring',
        category: 'Technology Support',
        volunteer_name: 'Marcus Wong',
        created_at: '2026-10-01T14:30:00',
        support_mode: 'Virtual',
        status: 'Accepted',
      },
      {
        request_id: 'R4545',
        title: 'Python Debugging',
        category: 'Academic Support',
        volunteer_name: 'John Doe',
        created_at: '2026-09-21T11:15:00',
        support_mode: 'Virtual',
        status: 'Cancelled',
      },
    ];
  }

  // Evaluates if a request is stuck in 'Pending' for over 3 days[cite: 9, 10]
  isStalePending(request: StudentRequest): boolean {
    if (request.status !== 'Pending') {
      return false;
    }

    const createdDate = new Date(request.created_at);

    const diffTime = this.currentSystemDate.getTime() - createdDate.getTime();

    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays > 3;
  }

  onChangeVolunteer(request: StudentRequest): void {
    alert(
      `Initiating volunteer re-selection for Request ${request.request_id}. Redirecting to matching pool...`,
    );
    // Here you would navigate back to the matching-results component with the request details[cite: 9]
  }

  onGoBack(): void {
    window.history.back();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }
}
