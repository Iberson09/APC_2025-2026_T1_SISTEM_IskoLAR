import { AppSemester } from './user';

export interface SchoolYear {
  id: string;
  academic_year: number;
  created_at?: string;
  updated_at?: string;
  isCurrent?: boolean;
  canUndo?: boolean;
  semesters?: Semester[];
}

export interface Semester {
  id: string;
  school_year_id: string;
  name: AppSemester;
  start_date: string;
  end_date: string;
  applications_open: boolean;
  created_at?: string;
  updated_at?: string;
  applications?: Application[];
  stats?: SemesterStats;
}

export interface Application {
  id: string;
  user_id: string;
  semester_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      gender?: string;
      birthdate?: string;
      contact_number?: string;
    };
  };
}

export interface SemesterStats {
  semester_id: string;
  semester_name: string;
  academic_year: number;
  school_year_id: string;
  applications_open: boolean;
  start_date: string;
  end_date: string;
  total_applications: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}