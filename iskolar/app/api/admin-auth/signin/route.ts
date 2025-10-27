import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create an admin supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email_address, password } = await request.json();

    // First verify if this is an admin account
    console.log('Checking admin account:', email_address);
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin')
      .select(`
        *,
        role:role!role_id (
          name
        )
      `)
      .eq('email_address', email_address)
      .single();

    if (adminError || !adminData) {
      console.log('Admin account check failed:', adminError || 'No admin data found');
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }
    console.log('Admin account found:', adminData);

    // Try to sign in with admin credentials first
    console.log('Attempting admin sign in with Supabase auth...');
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: email_address,
      password: password,
    });

    if (signInError) {
      console.log('Sign in failed:', signInError.message);
      
      // If sign in failed, it could be:
      // 1. User doesn't exist in auth yet - create them
      // 2. User exists but wrong password - return error
      // 3. User exists but needs password update
      
      if (signInError.message === 'Invalid login credentials') {
        // Check if auth user exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUsers?.users.some(u => u.email === email_address);
        
        if (userExists) {
          // User exists but password doesn't match - try to sync it from admin table if available
          console.log('User exists but password is incorrect. Attempting to sync password from admin table...');
          
          // If admin table has a password, try to update the auth user's password to match
          if (adminData.password) {
            const existingUser = existingUsers?.users.find(u => u.email === email_address);
            
            if (existingUser) {
              // Update the auth user's password to match the admin table
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                existingUser.id,
                { password: adminData.password }
              );
              
              if (updateError) {
                console.error('Error syncing password:', updateError);
                return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
              }
              
              console.log('Password synced from admin table. Attempting sign in...');
              
              // Try signing in with the synced password
              const { data: syncedSignInData, error: syncedSignInError } = await supabaseAdmin.auth.signInWithPassword({
                email: email_address,
                password: adminData.password,
              });
              
              if (syncedSignInError) {
                console.error('Sign in failed after password sync:', syncedSignInError);
                return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
              }
              
              console.log('Sign in successful after password sync');
              return NextResponse.json({ 
                success: true,
                session: syncedSignInData.session,
                admin: {
                  ...adminData,
                  role: adminData.role.name
                }
              });
            }
          }
          
          // If no password in admin table or sync failed, return error
          console.log('User exists but password is incorrect and no sync available');
          return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
        }
      }
      
      // Try to create the user
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email_address,
        password: password,
        email_confirm: true,
        user_metadata: {
          role_id: adminData.role_id,
          is_admin: true
        }
      });

      if (createError) {
        console.error('Error creating auth user:', createError);
        
        // If user already exists, try updating their password instead
        if (createError.message.includes('already been registered')) {
          console.log('User already exists, attempting to update password...');
          
          // Get the user by email
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users.find(u => u.email === email_address);
          
          if (existingUser) {
            // Update the user's password
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              existingUser.id,
              { password: password }
            );
            
            if (updateError) {
              console.error('Error updating password:', updateError);
              return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
            }
            
            console.log('Password updated, attempting sign in...');
            
            // Try signing in with the updated password
            const { data: finalSignInData, error: finalSignInError } = await supabaseAdmin.auth.signInWithPassword({
              email: email_address,
              password: password,
            });

            if (finalSignInError) {
              console.error('Final sign in failed:', finalSignInError);
              return NextResponse.json({ error: 'Unable to sign in after password update' }, { status: 401 });
            }

            console.log('Sign in successful after password update');
            return NextResponse.json({ 
              success: true,
              session: finalSignInData.session,
              admin: {
                ...adminData,
                role: adminData.role.name
              }
            });
          }
        }
        
        return NextResponse.json({ error: 'Failed to create auth user: ' + createError.message }, { status: 500 });
      }

      console.log('Auth user created successfully, attempting final sign in...');

      // Try signing in again with the new credentials
      const { data: finalSignInData, error: finalSignInError } = await supabaseAdmin.auth.signInWithPassword({
        email: email_address,
        password: password,
      });

      if (finalSignInError) {
        console.error('Final sign in failed:', finalSignInError);
        return NextResponse.json({ error: 'Unable to sign in after user creation' }, { status: 401 });
      }

      console.log('Final sign in successful');
      return NextResponse.json({ 
        success: true,
        session: finalSignInData.session,
        admin: {
          ...adminData,
          role: adminData.role.name
        }
      });
    }

    // If initial sign in was successful, return the session
    console.log('Initial sign in successful');
    return NextResponse.json({ 
      success: true,
      session: signInData.session,
      admin: {
        ...adminData,
        role: adminData.role.name
      }
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
