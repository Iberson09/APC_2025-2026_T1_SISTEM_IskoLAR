import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: releases, error } = await supabase
      .from('releases')
      .select('*')
      .order('releasedate', { ascending: true });

    if (error) throw error;

    return NextResponse.json(releases);
  } catch (error) {
    console.error('Error fetching releases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch releases' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const json = await request.json();

    const { error } = await supabase
      .from('releases')
      .insert([{
        releasetype: json.releasetype,
        releasedate: json.releasedate,
        releasetime: json.releasetime,
        barangay: json.barangay,
        location: json.location,
        amountperstudent: json.amountperstudent,
        numberofrecipients: json.numberofrecipients,
        additionalnotes: json.additionalnotes
      }]);

    if (error) throw error;

    return NextResponse.json({ message: 'Release created successfully' });
  } catch (error) {
    console.error('Error creating release:', error);
    return NextResponse.json(
      { error: 'Failed to create release' },
      { status: 500 }
    );
  }
}