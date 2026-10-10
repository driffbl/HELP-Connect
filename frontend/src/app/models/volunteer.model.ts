export interface Volunteer {
  volunteer_id: number;
  user_id: number;
  user_name: string;
  support_category:
    'Academic Support' | 'Technology Support' | 'New Student Support' | 'General Student Support';
  skills_description: string;
  preferred_mode: 'Virtual' | 'Face-to-Face' | 'Both';
  availability_notes: string;
  is_active: boolean;
  rating: number; // Supports US-04 (Should-Have): Highest rated sorting
  completed_sessions: number; // Supports US-04 (Should-Have): Experience sorting
}
