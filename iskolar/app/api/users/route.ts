import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSuperAdmin } from '@/lib/auth/roles';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // First, get all admin emails
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin')
      .select('email_address');

    if (adminError) {
      console.error('Error fetching admin emails:', adminError);
      throw adminError;
    }

    const adminEmails = new Set(adminData?.map(admin => admin.email_address) || []);

    // Fetch all users
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        user_id,
        email_address,
        first_name,
        last_name,
        middle_name,
        mobile_number,
        last_login,
        created_at,
        updated_at
      `);

    if (error) throw error;
    
    // Filter out users whose email exists in the admin table
    const filteredUsers = data?.filter(user => !adminEmails.has(user.email_address)) || [];
    
    return NextResponse.json(filteredUsers);
  } catch (err: unknown) {
    console.error('ERROR IN GET /api/users:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Create a new user account (SUPER_ADMIN only)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminEmail, userData, password } = body;

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }

    if (!userData || !password) {
      return NextResponse.json(
        { error: 'User data and password are required' },
        { status: 400 }
      );
    }

    // Check if user is super_admin
    const isSuperAdminUser = await isSuperAdmin(adminEmail);
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Only super administrators can create user accounts' },
        { status: 403 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email_address,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: userData.first_name,
        last_name: userData.last_name,
        middle_name: userData.middle_name
      }
    });

    if (authError) {
      throw new Error(`Auth Error: ${authError.message}`);
    }

    // Create user record in database
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        user_id: authData.user.id,
        email_address: userData.email_address,
        first_name: userData.first_name,
        last_name: userData.last_name,
        middle_name: userData.middle_name,
        mobile_number: userData.mobile_number
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete auth user if database insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Database Error: ${dbError.message}`);
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: dbData
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`ERROR IN POST /api/users:`, err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}