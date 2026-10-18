import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatchingService } from '../../services/matching.service';
import { Header } from '../../components/header/header';

export interface StudentRequestItem {
  request_id: number | string;
  category: string;
  description: string;
  preferred_date: string;
  preferred_time: string;
  support_mode: string;
  volunteer_name: string;
  status: 'Pending' | 'Accepted' | 'Cancelled' | 'Rejected';
  created_at: string;
}

@Component({
  selector: 'app-student-requests',
  standalone: true,
  imports: [CommonModule, Header],
  templateUrl: './student-request.html',
  styleUrls: ['./student-request.css'],
})
export class StudentRequests implements OnInit {
  requests: StudentRequestItem[] = [];
  isLoading: boolean = false;
  currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  studentId: number = Number(this.currentUser.User_id || this.currentUser.user_id || 1);
  currentSystemDate: Date = new Date();

  constructor(
    private matchingService: MatchingService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.currentUser || Object.keys(this.currentUser).length === 0) {
      console.warn('No active login session found. Redirecting to login...');
    }

    this.loadStudentRequests();
  }

  loadStudentRequests(): void {
    this.isLoading = true;
    this.matchingService.getStudentRequests(this.studentId).subscribe({
      next: (data: any[]) => {
        this.requests = data.map((item) => ({
          request_id: item.Request_id || item.request_id,
          category: item.Category_name || item.category || 'Academic Support',
          description: item.Description || item.description || '',
          preferred_date: item.Preferred_date || item.preferred_date || item.created_at,
          preferred_time: item.Preferred_time || item.preferred_time || '09:00',
          support_mode: item.Support_mode || item.support_mode || 'Virtual',
          volunteer_name: item.Volunteer_name || item.volunteer_name || 'Unassigned',
          status: item.Request_status || item.status || 'Pending',
          created_at: item.created_at || new Date().toISOString(),
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

  // Eligible if Rejected OR Pending for >= 3 days
  canChangeVolunteer(req: StudentRequestItem): boolean {
    if (req.status === 'Rejected') {
      return true;
    }

    if (req.status === 'Pending') {
      const createdDate = new Date(req.created_at);
      const diffTime = Math.abs(this.currentSystemDate.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 3;
    }

    return false;
  }

  onChangeVolunteer(req: StudentRequestItem): void {
    const numericId = String(req.request_id).replace(/\D/g, '');

    // 1. Convert any date format (ISO, DD/MM/YYYY, etc.) to strict YYYY-MM-DD
    let standardDate = '';
    if (req.preferred_date) {
      if (req.preferred_date.includes('/')) {
        // Handles "12/10/2026" (DD/MM/YYYY)
        const parts = req.preferred_date.split('/');
        standardDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (req.preferred_date.includes('T')) {
        // Handles ISO "2026-10-12T00:00:00.000Z"
        standardDate = req.preferred_date.split('T')[0];
      } else {
        standardDate = req.preferred_date;
      }
    }

    // 2. Convert time to clean 24-hour HH:MM (strip AM/PM if present)
    let standardTime = req.preferred_time || '11:30';
    if (standardTime.toUpperCase().includes('AM') || standardTime.toUpperCase().includes('PM')) {
      const isPM = standardTime.toUpperCase().includes('PM');
      const clean = standardTime.replace(/(AM|PM|\s)/gi, '');
      const [h, m] = clean.split(':');
      let hourNum = parseInt(h, 10);
      if (isPM && hourNum < 12) hourNum += 12;
      if (!isPM && hourNum === 12) hourNum = 0;
      standardTime = `${String(hourNum).padStart(2, '0')}:${m || '00'}`;
    }

    // 3. Navigate with pristine parameters
    this.router.navigate(['/matching-results'], {
      queryParams: {
        category: req.category,
        mode: req.support_mode,
        date: standardDate, // e.g. "2026-10-12"
        time: standardTime, // e.g. "11:30"
        requestId: numericId,
      },
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
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
