import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: { releaseid: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const json = await request.json();
    const releaseid = params.releaseid;

    const { error } = await supabase
      .from('releases')
      .update({
        releasetype: json.releasetype,
        releasedate: json.releasedate,
        releasetime: json.releasetime,
        barangay: json.barangay,
        location: json.location,
        amountperstudent: json.amountperstudent,
        numberofrecipients: json.numberofrecipients,
        additionalnotes: json.additionalnotes
      })
      .eq('releaseid', releaseid);

    if (error) throw error;

    return NextResponse.json({ message: 'Release updated successfully' });
  } catch (error) {
    console.error('Error updating release:', error);
    return NextResponse.json(
      { error: 'Failed to update release' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { releaseid: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const releaseid = params.releaseid;

    const { error } = await supabase
      .from('releases')
      .delete()
      .eq('releaseid', releaseid);

    if (error) throw error;

    return NextResponse.json({ message: 'Release deleted successfully' });
  } catch (error) {
    console.error('Error deleting release:', error);
    return NextResponse.json(
      { error: 'Failed to delete release' },
      { status: 500 }
    );
  }
}