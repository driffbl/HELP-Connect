import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchingService } from '../../services/matching.service';
import { Header } from '../../components/header/header';

export interface IncomingRequest {
  request_id: number | string;
  category: string;
  description: string;
  student_name: string;
  student_avatar: string;
  date: string;
  time: string;
  support_mode: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
}

@Component({
  selector: 'app-volunteer-inbox',
  standalone: true,
  imports: [CommonModule, Header],
  templateUrl: './volunteer-inbox.html',
  styleUrls: ['./volunteer-inbox.css'],
})
export class VolunteerInbox implements OnInit {
  pendingRequests: IncomingRequest[] = [];
  isLoading: boolean = false;
  volunteerId: number = 10; // Current test volunteer ID

  // Default fallback avatar if student has no profile picture
  defaultAvatar: string =
    'https://media.istockphoto.com/id/519078727/photo/male-silhouette-as-avatar-profile-picture.webp?b=1&s=612x612&w=0&k=20&c=e-ihFzR4K3T7-bu3IHpBbRz2C-BY4WKB1Qn-rQysAFs=';

  constructor(
    private matchingService: MatchingService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadIncomingRequests();
  }

  loadIncomingRequests(): void {
    this.isLoading = true;
    // Uses your existing service method: getVolunteerIncoming
    this.matchingService.getVolunteerIncoming(this.volunteerId).subscribe({
      next: (data: any[]) => {
        this.pendingRequests = data.map((item) => ({
          request_id: item.request_id || item.Request_id,
          category: item.category || item.Category_name || 'Academic Support',
          description: item.description || item.Description || '',
          student_name: item.student_name || item.Student_name || 'Student',
          student_avatar: item.student_avatar || item.Student_avatar || this.defaultAvatar,
          date: item.preferred_date || item.Preferred_date || '',
          time: item.preferred_time || item.Preferred_time || '12:00',
          support_mode: item.support_mode || item.Support_mode || 'Virtual',
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
    const id = Number(String(req.request_id).replace(/\D/g, ''));
    // Uses your existing service method: updateStatus
    this.matchingService.updateStatus(id, 'Accepted').subscribe({
      next: () => {
        alert(`Request #${id} accepted! The student has been notified.`);
        this.pendingRequests = this.pendingRequests.filter((r) => r.request_id !== req.request_id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to accept request:', err);
        alert('Failed to accept request in the database.');
      },
    });
  }

  onRejectRequest(req: IncomingRequest): void {
    const id = Number(String(req.request_id).replace(/\D/g, ''));
    // Uses your existing service method: updateStatus
    this.matchingService.updateStatus(id, 'Rejected').subscribe({
      next: () => {
        alert(`Request #${id} rejected. The student can now reselect another volunteer.`);
        this.pendingRequests = this.pendingRequests.filter((r) => r.request_id !== req.request_id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to reject request:', err);
        alert('Failed to reject request in the database.');
      },
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return timeStr;

    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  }

  onGoBack(): void {
    window.history.back();
  }
}
