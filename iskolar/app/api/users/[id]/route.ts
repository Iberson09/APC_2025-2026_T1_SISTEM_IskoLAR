import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSuperAdmin, hasPermission } from '@/lib/auth/roles';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Deactivate or reactivate a user (Both admin and super_admin can do this)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { adminEmail } = body;

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }

    // Check if user has admin permissions (both admin and super_admin allowed)
    const hasAdminPermission = await hasPermission(adminEmail, 'admin');
    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: 'Only administrators can manage users' },
        { status: 403 }
      );
    }

    // Deactivate the user in auth service
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { ban_duration: '87600h' } // Effectively ban for 10 years
    );

    if (error) throw error;
    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`ERROR IN PATCH /api/users/[id]:`, err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Permanently delete a user (SUPER_ADMIN only)
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { adminEmail } = body;

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }

    // Check if user is super_admin
    const isSuperAdminUser = await isSuperAdmin(adminEmail);
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Only super administrators can delete users' },
        { status: 403 }
      );
    }
    
    // This command deletes the user from Supabase Authentication
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    // FIX: You must check for an error here.
    if (authError) {
      throw new Error(`Supabase Auth Error: ${authError.message}`);
    }

    // The user will be automatically deleted from your 'users' table
    // if its foreign key has ON DELETE CASCADE. This is a good safety net:
    await supabaseAdmin.from('users').delete().eq('user_id', id);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`ERROR IN DELETE /api/users/[id]:`, err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Edit user details (SUPER_ADMIN only)
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { adminEmail, userData } = body;

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User data is required' },
        { status: 400 }
      );
    }

    // Check if user is super_admin
    const isSuperAdminUser = await isSuperAdmin(adminEmail);
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Only super administrators can edit users' },
        { status: 403 }
      );
    }

    // Update user in database
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(userData)
      .eq('user_id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database Error: ${error.message}`);
    }

    // If email is being updated, also update in auth
    if (userData.email_address) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { email: userData.email_address }
      );

      if (authError) {
        console.error('Warning: Failed to update auth email:', authError);
        // Don't fail the request, just log the warning
      }
    }

    return NextResponse.json({
      message: 'User updated successfully',
      user: data
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`ERROR IN PUT /api/users/[id]:`, err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}