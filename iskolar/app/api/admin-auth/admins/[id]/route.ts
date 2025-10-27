import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSuperAdmin } from '@/lib/auth/roles';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get user from Authorization header
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[getUserFromRequest] No Bearer token found');
    return null;
  }

  const accessToken = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user) {
      console.log('[getUserFromRequest] Token verification failed:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.log('[getUserFromRequest] Error verifying token:', error);
    return null;
  }
}

// Verify super admin password
async function verifyAdminPassword(email: string, password: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });
    return !error;
  } catch {
    return false;
  }
}

// PATCH update admin role (super_admin only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Get current user
    console.log('[PATCH /api/admin-auth/admins/[id]] Getting current user...');
    const user = await getUserFromRequest(request);
    
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    console.log('[PATCH /api/admin-auth/admins/[id]] Checking super admin status...');
    const isSuperAdminUser = await isSuperAdmin(user.email);
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Only super administrators can update admin roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { roleId, confirmationPassword } = body;

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Verify password for sensitive operation
    if (!confirmationPassword) {
      return NextResponse.json(
        { error: 'Password confirmation is required' },
        { status: 400 }
      );
    }

    console.log('[PATCH /api/admin-auth/admins/[id]] Verifying password...');
    const isPasswordValid = await verifyAdminPassword(user.email, confirmationPassword);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password. Please verify your credentials.' },
        { status: 403 }
      );
    }

    // Update admin role in database
    console.log('[PATCH /api/admin-auth/admins/[id]] Updating admin role...');
    const { data, error } = await supabaseAdmin
      .from('admin')
      .update({ role_id: roleId, updated_at: new Date().toISOString() })
      .eq('admin_id', id)
      .select(`
        admin_id,
        email_address,
        created_at,
        updated_at,
        role:role_id (
          role_id,
          name,
          description
        )
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      message: 'Admin role updated successfully',
      admin: data
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update admin' },
      { status: 500 }
    );
  }
}

// DELETE admin (super_admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Get current user
    console.log('[DELETE /api/admin-auth/admins/[id]] Getting current user...');
    const user = await getUserFromRequest(request);
    
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    console.log('[DELETE /api/admin-auth/admins/[id]] Checking super admin status...');
    const isSuperAdminUser = await isSuperAdmin(user.email);
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Only super administrators can delete admins' },
        { status: 403 }
      );
    }

    // Get admin to check if trying to delete self
    const { data: adminToDelete } = await supabaseAdmin
      .from('admin')
      .select('email_address')
      .eq('admin_id', id)
      .single();

    // Prevent self-deletion
    if (adminToDelete?.email_address === user.email) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Get confirmation password from request body
    const body = await request.json();
    const { confirmationPassword } = body;

    // Verify password for sensitive operation
    if (!confirmationPassword) {
      return NextResponse.json(
        { error: 'Password confirmation is required' },
        { status: 400 }
      );
    }

    console.log('[DELETE /api/admin-auth/admins/[id]] Verifying password...');
    const isPasswordValid = await verifyAdminPassword(user.email, confirmationPassword);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password. Please verify your credentials.' },
        { status: 403 }
      );
    }

    // Delete from admin table first
    console.log('[DELETE /api/admin-auth/admins/[id]] Deleting admin from database...');
    const { error: dbError } = await supabaseAdmin
      .from('admin')
      .delete()
      .eq('admin_id', id);

    if (dbError) {
      throw new Error(`Database Error: ${dbError.message}`);
    }

    // Delete from Supabase Auth
    console.log('[DELETE /api/admin-auth/admins/[id]] Deleting admin from auth...');
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error('[DELETE /api/admin-auth/admins/[id]] Auth deletion warning:', authError.message);
      // Don't throw here - admin is already deleted from DB
    }

    return NextResponse.json({
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete admin' },
      { status: 500 }
    );
  }
}
