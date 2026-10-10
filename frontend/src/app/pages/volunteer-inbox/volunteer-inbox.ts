import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface IncomingRequest {
  request_id: string;
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
  incomingRequests: IncomingRequest[] = [];

  ngOnInit(): void {
    this.loadIncomingRequests();
  }

  loadIncomingRequests(): void {
    // Mock data based on the provided wireframe structure
    this.incomingRequests = [
      {
        request_id: 'R4583',
        title: 'Help with Docker',
        category: 'Technology Support',
        description:
          'Need help writing a Dockerfile for a Node.js microservice and debugging container port mapping errors on Windows.',
        student_name: 'Sarah Lee',
        date: '16 October 2026',
        time: '2:00 PM - 4:00 PM',
        support_mode: 'Face-to-Face',
        status: 'Pending',
      },
      {
        request_id: 'R4584',
        title: 'Python Assignment Debugging',
        category: 'Academic Support',
        description: 'Stuck with recursive tree traversal and dictionary data structures for my BIT216 assignment submission.',
        student_name: 'Ali',
        date: '17 October 2026',
        time: '10:00 AM - 11:30 AM',
        support_mode: 'Virtual',
        status: 'Pending',
      },
    ];
  }

  // Gets only the requests that haven't been acted upon yet
  get pendingRequests(): IncomingRequest[] {
    return this.incomingRequests.filter((req) => req.status === 'Pending');
  }

  onAcceptRequest(request: IncomingRequest): void {
    // In production, this makes a PATCH request to the backend
    request.status = 'Accepted';
    alert(`Request ${request.request_id} has been Accepted. The student will be notified.`);
  }

  onRejectRequest(request: IncomingRequest): void {
    // In production, this makes a PATCH request to the backend
    request.status = 'Rejected';
    alert(`Request ${request.request_id} has been Rejected. The student will be notified.`);
  }

  onGoBack(): void {
    window.history.back();
  }
}
