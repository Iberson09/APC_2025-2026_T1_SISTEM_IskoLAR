import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { userValidation } from '@/lib/types/user';

interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: string;
  birthdate: string;
  email: string;
  mobile: string;
  
  addressLine1?: string;
  addressLine2?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  region?: string;
  
  college?: string;
  course?: string;
  yearLevel?: string;
  gpa?: string;
  
  psaDocumentUrl?: string;
  voterDocumentUrl?: string;
  nationalIdDocumentUrl?: string;
  
  scholarId?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
}

// PUT /api/profile/update - Update user profile data
export async function PUT(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Create client for token verification
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error in PUT:', authError);
      return NextResponse.json({ 
        error: 'Invalid or expired token. Please sign in again.' 
      }, { status: 401 });
    }

    console.log('Authenticated user for profile update:', user.id);

    // Create service role client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the user profile data from request
    const userData: UserProfile = await request.json();

    // Validate required fields
    const missingFields = userValidation.validateRequiredFields(userData);
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }

    // Validate email format
    if (userData.email && !userValidation.validateEmail(userData.email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Clean and validate mobile number
    if (userData.mobile) {
      const mobileValidation = userValidation.validateContactNumber(userData.mobile);
      if (!mobileValidation.isValid) {
        return NextResponse.json({ error: mobileValidation.error }, { status: 400 });
      }
      userData.mobile = mobileValidation.value as string;
    }

    // Validate ZIP code if provided
    if (userData.zipCode && !userValidation.validateZipCode(userData.zipCode)) {
      return NextResponse.json({ 
        error: 'ZIP code must be exactly 4 digits' 
      }, { status: 400 });
    }

    // Get current profile data to track changes using admin client
    const { data: currentProfile, error: currentProfileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (currentProfileError) {
      console.error('Error fetching current profile:', currentProfileError);
      return NextResponse.json({ 
        error: 'Failed to fetch current profile for comparison' 
      }, { status: 500 });
    }

    // Track changed fields for history
    const changedFields: Record<string, { from: unknown; to: unknown }> = {};
    const fieldMappings = {
      firstName: 'first_name',
      lastName: 'last_name', 
      middleName: 'middle_name',
      gender: 'gender',
      birthdate: 'birthdate',
      email: 'email_address',
      mobile: 'mobile_number',
      addressLine1: 'address_line1',
      addressLine2: 'address_line2',
      barangay: 'barangay',
      city: 'city',
      province: 'province',
      zipCode: 'zip_code',
      region: 'region',
      college: 'college',
      course: 'course',
      // Note: Uncomment these after running the database migration:
      // yearLevel: 'year_level',
      // gpa: 'gpa'
    };

    Object.entries(fieldMappings).forEach(([jsField, dbField]) => {
      const newValue = userData[jsField as keyof UserProfile] || null;
      const oldValue = currentProfile[dbField] || null;
      
      if (newValue !== oldValue) {
        changedFields[jsField] = { from: oldValue, to: newValue };
      }
    });

    // Format the data for database update
    const userUpdateData: {
      // Personal info
      first_name: string;
      last_name: string;
      middle_name: string | null;
      gender: string | null;
      birthdate: string | null;
      email_address: string;
      mobile_number: string;
      
      // Address info
      address_line1: string | null;
      address_line2: string | null;
      barangay: string | null;
      city: string | null;
      province: string | null;
      zip_code: string | null;
      region: string | null;
      
      // Education info
      college: string | null;
      course: string | null;
      
      // Timestamp & History
      updated_at: string;
      profile_update_history?: { timestamp: string; changed_fields: Record<string, unknown>; updated_by: string }[];
    } = {
      // Personal info
      first_name: userData.firstName,
      last_name: userData.lastName,
      middle_name: userData.middleName || null,
      gender: userData.gender || null,
      birthdate: userData.birthdate || null,
      email_address: userData.email,
      mobile_number: userData.mobile,
      
      // Address info
      address_line1: userData.addressLine1 || null,
      address_line2: userData.addressLine2 || null, // Updated to match schema
      barangay: userData.barangay || null,
      city: userData.city || null,
      province: userData.province || null,
      zip_code: userData.zipCode || null, // Updated to match schema
      region: userData.region || null,
      
      // Education info
      college: userData.college || null,
      course: userData.course || null,
      // Note: year_level and gpa columns need to be added to database first
      // Uncomment these lines after running the migration:
      // year_level: userData.yearLevel || null,
      // gpa: userData.gpa || null,
      
      // Note: Document fields (birth_certificate, voters_certification, national_id) 
      // are NOT updated through this profile update endpoint to avoid NOT NULL constraint violations.
      // These should be handled separately through document upload endpoints.
      
      // Timestamp
      updated_at: new Date().toISOString(),
    };

    // Add to profile update history if there are changes
    if (Object.keys(changedFields).length > 0) {
      const historyEntry = {
        timestamp: new Date().toISOString(),
        changed_fields: changedFields,
        updated_by: user.id
      };

      // Get existing history and append new entry
      const existingHistory = currentProfile.profile_update_history || [];
      const updatedHistory = [...existingHistory, historyEntry];
      
      userUpdateData.profile_update_history = updatedHistory;
    }

    // Update in users table (as per requirements - save in public.users table, not auth table)
    console.log('Updating user profile with data:', JSON.stringify(userUpdateData, null, 2));
    
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(userUpdateData)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to update profile';
      if (updateError.message?.includes('permission')) {
        errorMessage = 'Permission denied. Please make sure you are logged in and have access to update your profile.';
      } else if (updateError.message?.includes('not found')) {
        errorMessage = 'Profile not found. Please contact support.';
      } else if (updateError.message) {
        errorMessage = updateError.message;
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: updateError.details
      }, { status: 500 });
    }

    // Get the updated user profile  
    const { data: updatedProfile, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !updatedProfile) {
      console.error('Error fetching updated profile:', fetchError);
      // Return success but without profile data - client will need to fetch it separately
      return NextResponse.json({ 
        success: true, 
        message: 'Profile updated successfully, but failed to fetch the updated profile'
      });
    }

    // Format response data to match our UserProfile interface
    const responseData: UserProfile = {
      userId: updatedProfile.user_id,
      firstName: updatedProfile.first_name,
      lastName: updatedProfile.last_name,
      middleName: updatedProfile.middle_name || '',
      gender: updatedProfile.gender || '',
      birthdate: updatedProfile.birthdate || '',
      email: updatedProfile.email_address,
      mobile: updatedProfile.mobile_number || '',
      
      addressLine1: updatedProfile.address_line1 || '',
      addressLine2: updatedProfile.address_line2 || '', // Updated to match schema
      barangay: updatedProfile.barangay || '',
      city: updatedProfile.city || '',
      province: updatedProfile.province || '',
      zipCode: updatedProfile.zip_code || '', // Updated to match schema
      region: updatedProfile.region || '',
      
      college: updatedProfile.college || '',
      course: updatedProfile.course || '',
      yearLevel: '', // updatedProfile.year_level || '', // Uncomment after migration
      gpa: '', // updatedProfile.gpa || '', // Uncomment after migration
      
      // Document URLs
      psaDocumentUrl: updatedProfile.birth_certificate || '',
      voterDocumentUrl: updatedProfile.voters_certification || '',
      nationalIdDocumentUrl: updatedProfile.national_id || '',
      
      // Other fields
      scholarId: updatedProfile.scholar_id || '',
      createdAt: updatedProfile.created_at || '',
      updatedAt: updatedProfile.updated_at || '',
      status: updatedProfile.status || '',
    };

    return NextResponse.json({ 
      success: true,
      message: 'Profile updated successfully',
      profile: responseData
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false 
    }, { status: 500 });
  }
}

// GET /api/profile/update - Get current user profile data
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Create client for token verification
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the user profile
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Format response data to match our UserProfile interface
    const responseData: UserProfile = {
      userId: profile.user_id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      middleName: profile.middle_name || '',
      gender: profile.gender || '',
      birthdate: profile.birthdate || '',
      email: profile.email_address,
      mobile: profile.mobile_number || '',
      
      addressLine1: profile.address_line1 || '',
      addressLine2: profile.address_line2 || '', // Updated to match schema
      barangay: profile.barangay || '',
      city: profile.city || '',
      province: profile.province || '',
      zipCode: profile.zip_code || '', // Updated to match schema
      region: profile.region || '',
      
      college: profile.college || '',
      course: profile.course || '',
      yearLevel: '', // profile.year_level || '', // Uncomment after migration
      gpa: '', // profile.gpa || '', // Uncomment after migration
      
      // Document URLs
      psaDocumentUrl: profile.birth_certificate || '',
      voterDocumentUrl: profile.voters_certification || '',
      nationalIdDocumentUrl: profile.national_id || '',
      
      // Other fields
      scholarId: profile.scholar_id || '',
      createdAt: profile.created_at || '',
      updatedAt: profile.updated_at || '',
      status: profile.status || '',
    };

    return NextResponse.json({ profile: responseData });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}