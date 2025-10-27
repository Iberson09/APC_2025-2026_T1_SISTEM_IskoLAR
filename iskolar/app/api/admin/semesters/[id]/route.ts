import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasPermission } from '@/lib/auth/roles';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: semesterId } = await context.params;
    const body = await request.json();
    const { applications_open } = body;

    // First verify the semester exists
    const { error: checkError } = await supabaseAdmin
      .from('semesters')
      .select('*')
      .eq('id', semesterId)
      .single();

    if (checkError) {
      console.error('Error finding semester:', checkError);
      return NextResponse.json(
        { error: 'Semester not found' },
        { status: 404 }
      );
    }

    // Then update it using stored procedure to bypass RLS
    const { error: updateError } = await supabaseAdmin.rpc(
      'admin_update_semester_status',
      { 
        target_id: semesterId,
        new_status: applications_open
      }
    );

    if (updateError) {
      console.error('Error updating semester:', updateError);
      return NextResponse.json(
        { error: 'Failed to update semester status' },
        { status: 500 }
      );
    }

    // Get the updated semester data
    const { data: updatedData, error: getError } = await supabaseAdmin
      .from('semesters')
      .select('*')
      .eq('id', semesterId)
      .single();

    if (getError) {
      console.error('Error getting updated semester:', getError);
      return NextResponse.json(
        { error: 'Failed to get updated semester data' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedData);
  } catch (error) {
    console.error('Error in semester PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    console.log('Starting semester deletion for ID:', id);

    // Get the admin credentials
    const body = await request.json();
    const { adminPassword, adminEmail } = body;
    
    console.log('Validating credentials for:', adminEmail);
    
    if (!adminPassword || !adminEmail) {
      console.error('Missing required fields:', { 
        hasPassword: !!adminPassword, 
        hasEmail: !!adminEmail 
      });
      return NextResponse.json(
        { error: 'Admin email and password are required' },
        { status: 400 }
      );
    }

    // First verify the user role in auth metadata
    const { data: { users }, error: adminUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    const adminUser = users?.find(user => user.email === adminEmail);
    
    if (adminUserError || !adminUser) {
      console.error('Error checking user:', adminUserError);
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      );
    }

    // Check if user has admin permissions using role guard
    const hasAdminPermission = await hasPermission(adminEmail, 'admin');
    if (!hasAdminPermission) {
      console.error('User not an administrator:', { email: adminEmail });
      return NextResponse.json(
        { error: 'Only administrators can delete semesters' },
        { status: 403 }
      );
    }

    // Now verify the password
    console.log('Verifying password for:', adminEmail);
    const { error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (authError) {
      console.error('Password verification failed:', authError.message);
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 403 }
      );
    }

    console.log('Password verified, proceeding with deletion');

    // First delete all applications for this semester
    const { error: appDeleteError } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('semester_id', id);

    if (appDeleteError) {
      console.error('Error deleting applications:', appDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete associated applications' },
        { status: 500 }
      );
    }

    // Verify the semester exists before deleting
    const { data: semesterData, error: findError } = await supabaseAdmin
      .from('semesters')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !semesterData) {
      console.error('Semester not found:', { id, error: findError });
      return NextResponse.json(
        { error: 'Semester not found' },
        { status: 404 }
      );
    }

    console.log('Found semester to delete:', semesterData);

    // Delete using raw SQL to bypass RLS
    const { error: deleteError } = await supabaseAdmin.rpc(
      'admin_delete_semester_with_apps',
      { target_id: id }
    );

    if (deleteError) {
      console.error('Error in delete operation:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete semester: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Verify deletion
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('semesters')
      .select('*')
      .eq('id', id)
      .single();

    if (!verifyError && verifyData) {
      console.error('Semester still exists after deletion:', verifyData);
      return NextResponse.json(
        { error: 'Failed to delete semester - deletion verification failed' },
        { status: 500 }
      );
    }

    console.log('Semester successfully deleted');
    const response = NextResponse.json({ success: true });
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Unexpected error in semester DELETE:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}