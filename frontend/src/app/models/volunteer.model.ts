export interface Volunteer {
  volunteer_id: number;
  user_id: number;
  user_name: string;
  avatar_url?: string;
  categories?: string[];
  support_category:
    'Academic Support' | 'Technology Support' | 'New Student Support' | 'General Student Support';
  skills_description: string;
  skills_list?: string;
  preferred_mode: 'Virtual' | 'Face-to-Face' | 'Both';
  availability_notes: string;
  all_categories?: string;
  is_active: boolean;
  rating: number;
  completed_sessions: number;
}
