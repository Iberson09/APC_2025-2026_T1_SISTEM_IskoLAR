import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/applications/me
 * Returns the authenticated user's application history grouped by semester
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Create client with user's token
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify session
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Fetch user's applications with semester and school year details
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        semester:semesters!semester_id (
          id,
          name,
          start_date,
          end_date,
          applications_open,
          school_year:school_years!school_year_id (
            id,
            academic_year,
            is_active
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error in GET /api/applications/me:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/applications
 * Creates a new application for the current user in the active open semester
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Create client with user's token
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify session
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user is an admin (admins cannot submit applications)
    const { data: adminCheck } = await supabaseAdmin
      .from('admin')
      .select('id')
      .eq('email_address', user.email)
      .single();

    if (adminCheck) {
      return NextResponse.json(
        { error: 'Admins cannot submit scholarship applications' },
        { status: 403 }
      );
    }

    // Get the currently active open semester
    const { data: activeSemesters, error: semesterError } = await supabaseAdmin
      .rpc('get_active_open_semester');

    if (semesterError || !activeSemesters || activeSemesters.length === 0) {
      console.error('No active open semester:', semesterError);
      return NextResponse.json(
        { 
          error: 'No active semester is currently accepting applications',
          details: 'Please check back when the application period is open.'
        },
        { status: 400 }
      );
    }

    const activeSemester = activeSemesters[0];

    // Check if user already has an application for this semester
    const { data: existingApp } = await supabaseAdmin
      .from('applications')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('semester_id', activeSemester.semester_id)
      .single();

    if (existingApp) {
      return NextResponse.json(
        { 
          error: 'You have already submitted an application for this semester',
          application: existingApp
        },
        { status: 409 }
      );
    }

    // Parse request body for additional application data (optional)
    const body = await request.json().catch(() => ({}));

    // Create the application
    const { data: newApplication, error: insertError } = await supabaseAdmin
      .from('applications')
      .insert({
        user_id: user.id,
        semester_id: activeSemester.semester_id,
        status: body.status || 'pending',
        ...body // Allow additional fields from request body
      })
      .select(`
        id,
        status,
        created_at,
        semester:semesters!semester_id (
          id,
          name,
          start_date,
          end_date,
          school_year:school_years!school_year_id (
            id,
            academic_year
          )
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating application:', insertError);
      
      // Handle specific constraint violations
      if (insertError.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'You have already submitted an application for this semester' },
          { status: 409 }
        );
      }

      if (insertError.code === '23503') { // Foreign key violation
        return NextResponse.json(
          { error: 'Invalid semester or user reference' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create application', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Application submitted successfully',
        application: newApplication 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
