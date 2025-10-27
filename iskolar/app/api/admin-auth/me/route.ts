import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin-auth/me
 * Returns the current authenticated admin user's information including role
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify the token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get admin data with role information
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin')
      .select(`
        *,
        role:role!role_id (
          role_id,
          name,
          description
        )
      `)
      .eq('email_address', user.email)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({
      admin_id: adminData.admin_id,
      email_address: adminData.email_address,
      role: adminData.role,
      created_at: adminData.created_at,
      updated_at: adminData.updated_at,
    });
  } catch (error) {
    console.error('Error in /api/admin-auth/me:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
