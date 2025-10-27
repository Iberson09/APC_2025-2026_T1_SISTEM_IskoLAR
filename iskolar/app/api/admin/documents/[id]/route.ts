import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET - Generate signed URL for document viewing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('Document API called with ID:', id);
    
    // First, let's find out which field name the documents table uses
    // Try fetching by documents_id first (most likely based on scholar page)
    let { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('documents_id', id)
      .maybeSingle();

    console.log('Query by documents_id:', { document, error: docError });

    // If not found, try doc_id
    if (!document && !docError) {
      ({ data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('doc_id', id)
        .maybeSingle());
      
      console.log('Query by doc_id:', { document, error: docError });
    }

    // If still not found, try document_id
    if (!document && !docError) {
      ({ data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('document_id', id)
        .maybeSingle());
      
      console.log('Query by document_id:', { document, error: docError });
    }

    if (docError) {
      console.error('Error fetching document:', docError);
      return NextResponse.json(
        { error: 'Database error', details: docError.message },
        { status: 500 }
      );
    }

    if (!document) {
      console.error('Document not found for ID:', id);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log('Document found:', document);
    console.log('File path:', document.file_path);

    // Generate signed URL
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 60 * 60); // Valid for 1 hour

    console.log('Signed URL response:', { data: signedUrlData, error: urlError });

    if (urlError) {
      console.error('Error generating signed URL:', urlError);
      return NextResponse.json(
        { error: 'Failed to generate document URL', details: urlError.message },
        { status: 500 }
      );
    }

    if (!signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      document: {
        id: document.documents_id || document.doc_id || document.document_id,
        type: document.document_type,
        name: document.file_name,
        size: document.file_size
      }
    });
  } catch (error) {
    console.error('Error in document API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
