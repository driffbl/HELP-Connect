import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchingService } from '../../services/matching.service';

export interface IncomingRequest {
  request_id: number | string;
  title: string;
  category: string;
  description: string;
  student_name: string;
  date: string;
  time: string;
  support_mode: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
}

@Component({
  selector: 'app-volunteer-inbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './volunteer-inbox.html',
  styleUrls: ['./volunteer-inbox.css'],
})
export class VolunteerInbox implements OnInit {
  pendingRequests: IncomingRequest[] = [];
  isLoading: boolean = false;
  volunteerId: number = 1;

  constructor(
    private matchingService: MatchingService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadIncomingRequests();
  }

  loadIncomingRequests(): void {
    this.isLoading = true;
    this.matchingService.getVolunteerIncoming(this.volunteerId).subscribe({
      next: (data: any[]) => {
        // Map database fields to the properties expected by volunteer-inbox.html
        this.pendingRequests = data.map((item) => ({
          request_id: item.request_id || item.Request_id,
          title: item.category || 'Support Request',
          category: item.category || item.Category_name,
          description: item.description || item.Description,
          student_name: item.student_name || item.Student_name || 'Student',
          date: item.preferred_date || item.Preferred_date,
          time: item.preferred_time || item.Preferred_time,
          support_mode: item.support_mode || item.Support_mode,
          status: item.status || item.Request_status || 'Pending',
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading inbox:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onAcceptRequest(req: IncomingRequest): void {
    const id = Number(req.request_id);
    this.matchingService.updateStatus(id, 'Accepted').subscribe({
      next: () => {
        alert(`Request #${id} accepted!`);
        this.pendingRequests = this.pendingRequests.filter((r) => r.request_id !== req.request_id);
        this.cdr.detectChanges();
      },
      error: () => alert('Failed to accept request.'),
    });
  }

  onRejectRequest(req: IncomingRequest): void {
    const id = Number(req.request_id);
    this.matchingService.updateStatus(id, 'Rejected').subscribe({
      next: () => {
        alert(`Request #${id} rejected.`);
        this.pendingRequests = this.pendingRequests.filter((r) => r.request_id !== req.request_id);
        this.cdr.detectChanges();
      },
      error: () => alert('Failed to reject request.'),
    });
  }

  onGoBack(): void {
    window.history.back();
  }
}
