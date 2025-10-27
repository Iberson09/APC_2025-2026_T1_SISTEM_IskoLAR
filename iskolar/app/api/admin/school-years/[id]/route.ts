import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasPermission } from '@/lib/auth/roles';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: schoolYear, error } = await supabaseAdmin
      .from('school_years')
      .select(`
        *,
        semesters (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching school year:', error);
      return NextResponse.json(
        { error: 'Failed to fetch school year' },
        { status: 500 }
      );
    }

    if (!schoolYear) {
      return NextResponse.json(
        { error: 'School year not found' },
        { status: 404 }
      );
    }

    // Check if the school year is undoable (created within 24 hours)
    const { data: canUndo, error: undoCheckError } = await supabaseAdmin.rpc(
      'can_undo_school_year',
      { p_school_year_id: id }
    );

    if (undoCheckError) {
      console.error('Error checking undo status:', undoCheckError);
      // Don't fail the request, just mark as not undoable
      return NextResponse.json({
        ...schoolYear,
        canUndo: false
      });
    }

    return NextResponse.json({
      ...schoolYear,
      canUndo: Boolean(canUndo)
    });
  } catch (error) {
    console.error('Error in school year GET:', error);
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
    
    // Get the admin credentials
    const body = await request.json();
    const { adminPassword, adminEmail } = body;
    
    if (!adminPassword || !adminEmail) {
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
        { error: 'Only administrators can delete academic years' },
        { status: 403 }
      );
    }

    // Verify the password
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

    // Check if the school year can be undone (within 24 hours)
    const { data: canUndo, error: undoCheckError } = await supabaseAdmin.rpc(
      'can_undo_school_year',
      { p_school_year_id: id }
    );

    if (undoCheckError) {
      console.error('Error checking undo eligibility:', undoCheckError);
      return NextResponse.json(
        { error: 'Failed to check if school year can be undone' },
        { status: 500 }
      );
    }

    if (!canUndo) {
      return NextResponse.json(
        { error: 'School year can only be undone within 24 hours of creation' },
        { status: 403 }
      );
    }

    // Call the stored procedure to delete the school year and create audit record
    const { error: deleteError } = await supabaseAdmin.rpc(
      'admin_delete_school_year',
      { 
        p_school_year_id: id,
        p_admin_email: adminEmail
      }
    );

    if (deleteError) {
      console.error('Error deleting school year:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete school year' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Error in school year DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}