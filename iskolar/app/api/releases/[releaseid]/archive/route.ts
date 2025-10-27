import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: { releaseid: string } }) {
  if (!params.releaseid) {
    return NextResponse.json(
      { error: 'Release ID is required' },
      { status: 400 }
    );
  }

  try {
    const { isArchived } = await request.json();

    // Create a new supabase client for each request
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    });

    // Check if release exists first
    const { data: existingRelease, error: fetchError } = await supabase
      .from('releases')
      .select('releaseid')
      .eq('releaseid', params.releaseid)
      .single();

    if (fetchError || !existingRelease) {
      return NextResponse.json(
        { error: 'Release not found' },
        { status: 404 }
      );
    }

    // Update the release archive status
    const { error: updateError } = await supabase
      .from('releases')
      .update({ isArchived })
      .eq('releaseid', params.releaseid);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update release status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Release ${isArchived ? 'archived' : 'unarchived'} successfully`
    });

  } catch (error) {
    console.error('Error in archive route:', error);
    return NextResponse.json({ 
      error: 'Internal server error while updating release' 
    }, { 
      status: 500 
    });
  }
}