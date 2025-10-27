import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSuperAdmin } from '@/lib/auth/roles';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get user from Authorization header
async function getUserFromRequest(request: NextRequest) {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization');
  let accessToken: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7);
    console.log('[getUserFromRequest] Found Bearer token in Authorization header');
  }
  
  if (!accessToken) {
    // Fallback: try to get from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    accessToken = cookies['sb-access-token'] || 
                 cookies['sb-localhost-auth-token'] ||
                 Object.values(cookies).find(v => v && v.length > 100) || null;
    
    if (accessToken) {
      console.log('[getUserFromRequest] Found token in cookies');
    }
  }

  if (!accessToken) {
    console.log('[getUserFromRequest] No auth token found');
    return null;
  }

  // Verify the token with Supabase
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user) {
      console.log('[getUserFromRequest] Token verification failed:', error);
      return null;
    }
    console.log('[getUserFromRequest] Token verified for user:', user.email);
    return user;
  } catch (error) {
    console.log('[getUserFromRequest] Error verifying token:', error);
    return null;
  }
}

// GET all admins (super_admin only)
export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/admin-auth/admins] Getting current user...');
    const user = await getUserFromRequest(request);
    console.log('[GET /api/admin-auth/admins] User data:', { email: user?.email, id: user?.id });
    
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - No user session found' },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    console.log('[GET /api/admin-auth/admins] Checking super admin status for:', user.email);
    const isSuperAdminUser = await isSuperAdmin(user.email);
    console.log('[GET /api/admin-auth/admins] Is super admin?', isSuperAdminUser);
    
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Only super administrators can view admin list' },
        { status: 403 }
      );
    }

    // Fetch all admins with their roles
    console.log('[GET /api/admin-auth/admins] Fetching admins from database...');
    const { data: admins, error } = await supabaseAdmin
      .from('admin')
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/admin-auth/admins] Database error:', error);
      throw new Error(error.message);
    }

    console.log('[GET /api/admin-auth/admins] Successfully fetched', admins?.length || 0, 'admins');
    return NextResponse.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch admins' },
      { status: 500 }
    );
  }
}

// POST create new admin (super_admin only)
export async function POST(request: NextRequest) {
  try {
    console.log('[POST /api/admin-auth/admins] Creating new admin...');
    const user = await getUserFromRequest(request);
    console.log('[POST /api/admin-auth/admins] Current user:', user?.email);
    
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    console.log('[POST /api/admin-auth/admins] Checking super admin status...');
    const isSuperAdminUser = await isSuperAdmin(user.email);
    console.log('[POST /api/admin-auth/admins] Is super admin?', isSuperAdminUser);
    
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Only super administrators can create admins' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, roleId } = body;
    console.log('[POST /api/admin-auth/admins] Request body:', { email, roleId });

    if (!email || !password || !roleId) {
      return NextResponse.json(
        { error: 'Email, password, and roleId are required' },
        { status: 400 }
      );
    }

    // Create admin in Supabase Auth
    console.log('[POST /api/admin-auth/admins] Creating auth user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        user_type: 'admin'
      }
    });

    if (authError) {
      console.error('[POST /api/admin-auth/admins] Auth error:', authError);
      throw new Error(`Auth Error: ${authError.message}`);
    }

    console.log('[POST /api/admin-auth/admins] Auth user created, creating admin record...');
    
    // Create admin record in database
    const { data: adminData, error: dbError } = await supabaseAdmin
      .from('admin')
      .insert({
        admin_id: authData.user.id,
        email_address: email,
        role_id: roleId
      })
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

    if (dbError) {
      // Rollback: delete auth user if database insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Database Error: ${dbError.message}`);
    }

    return NextResponse.json({
      message: 'Admin created successfully',
      admin: adminData
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create admin' },
      { status: 500 }
    );
  }
}
