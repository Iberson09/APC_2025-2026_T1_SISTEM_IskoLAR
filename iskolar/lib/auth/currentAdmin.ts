
'use client';

import { supabaseBrowser } from '../supabase/browser';
import type { AdminRoleName } from './roles';

export type CurrentAdmin = {
  admin_id: string;
  email_address: string;
  role: { name: AdminRoleName };
};

export async function fetchCurrentAdmin(): Promise<CurrentAdmin | null> {
  try {
    const supabase = supabaseBrowser();
    const { data: userRes, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('fetchCurrentAdmin - auth error:', userError);
      return null;
    }
    
    const email = userRes?.user?.email;
    if (!email) {
      console.log('fetchCurrentAdmin - no email found');
      return null;
    }

    console.log('fetchCurrentAdmin - querying for:', email);

    const { data, error } = await supabase
      .from('admin')
      .select('admin_id,email_address,role:role!role_id(name)')
      .eq('email_address', email)
      .single();

    if (error) {
      console.error('fetchCurrentAdmin - query error:', error);
      return null;
    }
    
    if (!data) {
      console.log('fetchCurrentAdmin - no admin data found');
      return null;
    }
    
    console.log('fetchCurrentAdmin - raw data:', data);
    
    // Supabase returns role as an array when using the join syntax
    const role = Array.isArray(data.role) ? data.role[0] : data.role;
    
    if (!role || !role.name) {
      console.error('fetchCurrentAdmin - invalid role data:', role);
      return null;
    }
    
    const result = {
      admin_id: data.admin_id,
      email_address: data.email_address,
      role: { name: role.name as AdminRoleName }
    };
    
    console.log('fetchCurrentAdmin - returning:', result);
    return result;
  } catch (err) {
    console.error('fetchCurrentAdmin - unexpected error:', err);
    return null;
  }
}
