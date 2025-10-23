'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface SchoolYear {
  id: string;
  academic_year: number;
  is_active: boolean;
}

interface Semester {
  id: string;
  name: string;
  school_year_id: string;
  applications_open: boolean;
  start_date: string;
  end_date: string;
}

export default function ApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const schoolYearId = params.schoolYearId as string;
  const semesterId = params.semesterId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Helper function to format semester name
  const formatSemesterName = (name: string) => {
    if (name === 'FIRST') return 'First Semester';
    if (name === 'SECOND') return 'Second Semester';
    return name;
  };

  useEffect(() => {
    validateRouteAndFetchData();
  }, [schoolYearId, semesterId]);

  const validateRouteAndFetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(schoolYearId) || !uuidRegex.test(semesterId)) {
        setError('Invalid URL parameters');
        setLoading(false);
        return;
      }

      // 1. Fetch and validate school year
      const { data: yearData, error: yearError } = await supabase
        .from('school_years')
        .select('id, academic_year, is_active')
        .eq('id', schoolYearId)
        .single();

      if (yearError || !yearData) {
        setError('Academic Year not found');
        setLoading(false);
        return;
      }

      if (!yearData.is_active) {
        setError('This Academic Year is not currently active');
        setLoading(false);
        return;
      }

      setSchoolYear(yearData);

      // 2. Fetch and validate semester
      const { data: semesterData, error: semesterError } = await supabase
        .from('semesters')
        .select('id, name, school_year_id, applications_open, start_date, end_date')
        .eq('id', semesterId)
        .eq('school_year_id', schoolYearId)
        .single();

      if (semesterError || !semesterData) {
        setError('Semester not found for this academic year');
        setLoading(false);
        return;
      }

      setSemester(semesterData);

      // 3. Check if semester is open (admin controlled via applications_open flag)
      const semesterIsOpen = semesterData.applications_open;
      setIsOpen(semesterIsOpen);

      // 4. Check for existing application
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingApp } = await supabase
          .from('application_details')
          .select('appdet_id')
          .eq('user_id', user.id)
          .eq('semester_id', semesterId)
          .single();

        if (existingApp) {
          setHasExistingApplication(true);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error validating route:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to submit an application');
        setSubmitting(false);
        return;
      }

      // Insert application
      const { data, error: insertError } = await supabase
        .from('application_details')
        .insert({
          user_id: user.id,
          semester_id: semesterId,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You have already submitted an application for this semester');
        } else if (insertError.message?.includes('can_accept_applications')) {
          setError('This semester is not currently accepting applications');
        } else {
          setError(`Failed to submit application: ${insertError.message}`);
        }
        setSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      setSubmitting(false);
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('An unexpected error occurred while submitting');
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#f5f6fa] pl-64 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !schoolYear) {
    return (
      <div className="min-h-screen w-full bg-[#f5f6fa] pl-64 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/scholar/announcements')}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <div className="min-h-screen w-full bg-[#f5f6fa] pl-64 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Application Submitted!</h3>
          <p className="text-sm text-gray-500 mb-6">
            Your scholarship application for {semester ? formatSemesterName(semester.name) : ''} has been submitted successfully.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/${schoolYearId}/${semesterId}/status`}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              View Status
            </Link>
            <button
              onClick={() => router.push('/scholar/announcements')}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Existing application state
  if (hasExistingApplication) {
    return (
      <div className="min-h-screen w-full bg-[#f5f6fa] pl-64 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Application Already Submitted</h3>
          <p className="text-sm text-gray-500 mb-6">
            You have already submitted an application for this semester.
          </p>
          <Link
            href={`/${schoolYearId}/${semesterId}/status`}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            View Application Status
          </Link>
        </div>
      </div>
    );
  }

  // Closed semester state
  if (!isOpen) {
    return (
      <div className="min-h-screen w-full bg-[#f5f6fa] pl-64 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Applications Closed</h3>
          <p className="text-sm text-gray-500 mb-2">
            Applications for {semester ? formatSemesterName(semester.name) : ''} are currently closed.
          </p>
          {semester?.start_date && semester?.end_date && (
            <p className="text-xs text-gray-400 mb-6">
              Application period: {new Date(semester.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} to {new Date(semester.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          <button
            onClick={() => router.push('/scholar/announcements')}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Main application form (only shown if semester is open)
  return (
    <div className="min-h-screen w-full bg-[#f5f6fa] pl-64">
      {/* Header */}
      <div className="fixed top-0 left-64 right-0 z-10 h-[60px] bg-white border-b border-gray-300 flex items-center gap-2 px-5">
        <span className="text-lg font-semibold">
          Scholarship Application
        </span>
        <span className="ml-4 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
          A.Y. {schoolYear?.academic_year} – {schoolYear ? schoolYear.academic_year + 1 : ''} • {semester ? formatSemesterName(semester.name) : ''}
        </span>
        <span className="ml-2 px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
          Applications Open
        </span>
      </div>

      {/* Content */}
      <div className="pt-[80px] px-8 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Info Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Scholarship Application Form
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Please fill out all required information below. Make sure all details are accurate before submitting.
            </p>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Temporary form - replace with your actual form */}
            <div className="border-t pt-6 mt-6">
              <p className="text-sm text-gray-500 mb-6">
                [Your existing application form fields go here]
              </p>
              
              {/* Submit Button */}
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitApplication}
                  disabled={submitting}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
