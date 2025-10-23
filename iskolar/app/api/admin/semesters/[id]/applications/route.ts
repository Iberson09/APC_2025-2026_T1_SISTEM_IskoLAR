import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Params = { id: string };

/**
 * GET /api/admin/semesters/[id]/applications
 * Returns all applications for a specific semester (admin only)
 * Query params: status (optional filter), page, limit
 */
export async function GET(
  request: NextRequest,
  context: { params: Params }
) {
  try {
    const semesterId = context.params.id;
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const statusFilter = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

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

    // Verify admin status
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin')
      .select('role_id')
      .eq('email_address', user.email)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('applications')
      .select(`
        id,
        user_id,
        status,
        created_at,
        updated_at,
        users:user_id (
          id,
          email,
          user_metadata
        )
      `, { count: 'exact' })
      .eq('semester_id', semesterId)
      .order('created_at', { ascending: false });

    // Apply status filter if provided
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: applications, error, count } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }

    // Get semester details
    const { data: semester, error: semesterError } = await supabaseAdmin
      .from('semesters')
      .select(`
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
      `)
      .eq('id', semesterId)
      .single();

    if (semesterError) {
      console.error('Error fetching semester:', semesterError);
    }

    // Get application statistics
    const { data: stats } = await supabaseAdmin
      .from('application_stats_by_semester')
      .select('*')
      .eq('semester_id', semesterId)
      .single();

    return NextResponse.json({
      applications,
      semester,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/admin/semesters/[id]/applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
