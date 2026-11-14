export interface Volunteer {
  volunteer_id: number;
  user_id: number;
  user_name: string;
  avatar_url?: string;
  categories?: string[];
  support_category:
    'Academic Support' | 'Technology Support' | 'New Student Support' | 'General Student Support';
  skills_description: string;
  preferred_mode: 'Virtual' | 'Face-to-Face' | 'Both';
  availability_notes: string;
  all_categories?: string;
  is_active: boolean;
  rating: number | null; // average of the students' ratings, or null when there are none yet
  review_count: number; // how many ratings that average is made of
  completed_sessions: number;
}
