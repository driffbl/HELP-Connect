export interface SupportRequest {
  request_id?: number;
  student_id: number;
  student_name: string;
  volunteer_id?: number | null;
  volunteer_name?: string;
  category:
    'Academic Support' | 'Technology Support' | 'New Student Support' | 'General Student Support';
  description: string;
  preferred_date: string;
  preferred_time: string;
  support_mode: 'Virtual' | 'Face-to-Face';
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';
  created_at?: string;
}
