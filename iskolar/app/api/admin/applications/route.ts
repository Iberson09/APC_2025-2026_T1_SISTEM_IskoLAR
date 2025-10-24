import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const semesterId = searchParams.get('semesterId');

    if (!semesterId) {
      return NextResponse.json(
        { error: 'Semester ID is required' },
        { status: 400 }
      );
    }

    // Fetch application details with explicit join to users table
    const { data: applications, error } = await supabase
      .from('application_details')
      .select(`
        appdet_id,
        status,
        created_at,
        semester_id,
        user_id,
        users!inner (
          first_name,
          last_name,
          email_address,
          barangay,
          college_university
        )
      `)
      .eq('semester_id', semesterId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to fetch applications', details: error.message },
        { status: 500 }
      );
    }

    console.log('Raw applications data:', JSON.stringify(applications?.slice(0, 1), null, 2));

    // Map database fields to frontend expectations
    const mappedApplications = applications?.map(app => {
      // With inner join, users should be a single object
      const userData = Array.isArray(app.users) ? app.users[0] : app.users;
      return {
        application_id: app.appdet_id,
        semester_id: app.semester_id,
        user_id: app.user_id,
        status: app.status,
        submitted_at: app.created_at,
        first_name: userData?.first_name || '',
        last_name: userData?.last_name || '',
        barangay: userData?.barangay || '',
        school: userData?.college_university || '',
        email_address: userData?.email_address || ''
      };
    }) || [];

    console.log('Mapped applications:', JSON.stringify(mappedApplications?.slice(0, 1), null, 2));

    return NextResponse.json(mappedApplications);
  } catch (error) {
    console.error('Error in applications API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
