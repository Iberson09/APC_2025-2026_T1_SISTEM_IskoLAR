import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

type AnnouncementUpdate = {
  updated_at: string;
  title?: string;
  content?: string;
  publish_date?: string;
  file_path?: string | null;
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const formData = await request.formData();

    const title = formData.get('title');
    if (title && typeof title !== 'string') return NextResponse.json({ error: 'Invalid title' }, { status: 400 });

    const content = formData.get('content');
    const publish_date = formData.get('publish_date');
    const file = formData.get('file') as File | null;

    let file_path: string | null = null;
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(fileName, buffer, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) return NextResponse.json({ error: 'File upload failed', details: uploadError }, { status: 500 });
      const { data: urlData } = supabase.storage.from('announcements').getPublicUrl(fileName);
      file_path = urlData.publicUrl;
    }

    const updatePayload: AnnouncementUpdate = {
      updated_at: new Date().toISOString()
    };
    if (title) updatePayload.title = String(title).trim();
    if (content) updatePayload.content = String(content).trim();
    if (publish_date) updatePayload.publish_date = String(publish_date).trim();
    if (file_path) updatePayload.file_path = file_path;

    console.log('PATCH /api/announcements/[id] - updating id:', id, 'payload:', updatePayload);
    const { error } = await supabase
      .from('announcements')
      .update(updatePayload)
      .eq('announcements_id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('ERROR IN PATCH /api/announcements/[id]:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    console.log('DELETE /api/announcements/[id] - deleting id:', id);
    const { error } = await supabase.from('announcements').delete().eq('announcements_id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('ERROR IN DELETE /api/announcements/[id]:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
