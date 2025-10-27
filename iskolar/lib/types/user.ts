﻿// Type definitions matching the database schema

// Enum Types
export type AppSemester = "First Semester" | "Second Semester";
export type AppStatus = "pending" | "submitted" | "under_review" | "approved" | "rejected" | "withdrawn";
export type UserRole = "scholar" | "reviewer" | "finance" | "super_admin";
export type DocumentType =
  | "registration_cert"
  | "birth_cert"
  | "barangay_id"
  | "shs_diploma"
  | "good_moral_cert"
  | "grades_cert"
  | "residency_cert"
  | "voter_cert_scholar"
  | "voter_cert_guardian"
  | "valid_id";
export type EducationLevel = "Junior High School" | "Senior High School" | "College";

/**
 * Base User Profile - matches the users table
 */
export interface UserBase {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender: string;
  birthdate: string; // ISO format: YYYY-MM-DD
  contact_number: string;
  
  // Address Information
  address_line1?: string;
  address_line2?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  region?: string;
  years_of_residency?: number;

  // Metadata
  last_login?: string;
  profile_update_history?: ProfileUpdateEntry[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Profile update history entry
 */
export interface ProfileUpdateEntry {
  timestamp: string;
  changed_fields: Record<string, {
    from: unknown;
    to: unknown;
  }>;
  updated_by: string;
}

/**
 * Application - matches the applications table
 */
export interface Application {
  id: string;
  user_id: string;
  academic_year: string;
  semester: AppSemester;
  status: AppStatus;
  created_at?: string;
  updated_at?: string;
}

/**
 * Application Details - matches the application_details table
 */
export interface ApplicationDetails {
  id: string;
  application_id: string;
  
  // Guardian Information
  mother_maiden_name: string;
  mother_occupation?: string;
  father_name: string;
  father_occupation?: string;

  // Current School Details
  college_name: string;
  college_address: string;
  course: string;
  year_level: string;
  gpa: number;

  created_at?: string;
  updated_at?: string;
}

/**
 * Educational History - matches the educational_history table
 */
export interface EducationalHistory {
  id: string;
  application_id: string;
  level: EducationLevel;
  school_name: string;
  school_address: string;
  year_started: number;
  year_graduated?: number;
  strand?: string;
  with_honors: boolean;
  expected_graduation?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Document - matches the documents table
 */
export interface Document {
  id: string;
  application_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number;
  status: string;
  uploaded_at: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * User Profile interface for API operations
 */
export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: string;
  birthdate: string;
  email: string;
  mobile: string;
  
  addressLine1?: string;
  addressLine2?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  region?: string;
  
  college?: string;
  course?: string;
  yearLevel?: string;
  gpa?: string;
  
  psaDocumentUrl?: string;
  voterDocumentUrl?: string;
  nationalIdDocumentUrl?: string;
  
  scholarId?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
}

/**
 * Registration interface for new users
 */
export interface UserRegistration extends Omit<UserBase, "id" | "created_at" | "updated_at" | "last_login" | "profile_update_history"> {
  password: string;
  college_name?: string;
  course?: string;
  confirmPassword?: string; // Only used in UI, not stored
}

/**
 * Validation utilities for user data
 */
export const userValidation = {
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validateContactNumber: (number: string): { isValid: boolean; value?: string; error?: string } => {
    if (!number || number.trim() === "") {
      return { isValid: false, error: "Contact number is required" };
    }
    
    const cleaned = number.replace(/\D/g, "");
    
    if (cleaned.length === 10 && cleaned.startsWith("9")) {
      return { isValid: true, value: "0" + cleaned };
    }
    
    if (cleaned.length === 11 && cleaned.startsWith("09")) {
      return { isValid: true, value: cleaned };
    }
    
    if (cleaned.length === 12 && cleaned.startsWith("639")) {
      return { isValid: true, value: "0" + cleaned.substring(2) };
    }
    
    return { isValid: false, error: "Invalid contact number format" };
  },

  validateZipCode: (zipCode: string): boolean => {
    return /^\d{4}$/.test(zipCode);
  },

  validateGPA: (gpa: number): boolean => {
    return gpa >= 1.00 && gpa <= 4.00;
  },

  validateYear: (year: number): boolean => {
    return year >= 2000 && year <= 2030;
  },

  validateFileSize: (size: number): boolean => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    return size <= MAX_FILE_SIZE;
  },

  validateRequiredFields: (fields: UserProfile | UserRegistration | Record<string, string | number | boolean | null | undefined>): string[] => {
    const requiredFields: Array<keyof UserBase> = ["first_name", "last_name", "email", "gender", "birthdate"];
    const missing: string[] = [];
    
    requiredFields.forEach(field => {
      const value = fields[field as keyof typeof fields];
      if (!value || value.toString().trim() === "") {
        // Convert database field names to UI field names
        const uiField = field.replace(/_([a-z])/g, g => g[1].toUpperCase());
        missing.push(uiField);
      }
    });
    
    return missing;
  },

  formatDateForDisplay: (isoDate: string): string => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "";
    
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
  },

  parseDisplayDate: (displayDate: string): string => {
    if (!displayDate) return "";
    
    const parts = displayDate.split(/[/\-]/);
    if (parts.length !== 3) return "";
    
    const month = parts[0].padStart(2, "0");
    const day = parts[1].padStart(2, "0");
    const year = parts[2];
    
    return `${year}-${month}-${day}`;
  }
};