import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { verifyDocumentFile } from '@/lib/ai-verification';

/**
 * POST /api/admin/documents/verify
 * Verify a document using AI cross-validation
 */
export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log('Starting AI verification for document:', documentId);

    // Fetch document from database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('documents_id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (document.ai_verified) {
      return NextResponse.json({
        message: 'Document already verified',
        verification: {
          summary: document.ai_summary,
          discrepancies: document.ai_discrepancies,
          confidenceLevel: document.confidence_level,
          extractedData: document.extracted_data,
          verificationDate: document.verification_date,
        },
      });
    }

    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', document.user_id)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    console.log('Document details:', {
      id: document.documents_id,
      type: document.document_type,
      fileName: document.file_name,
      filePath: document.file_path,
      fileSize: document.file_size,
    });

    // Download document from Supabase Storage
    console.log('Downloading document from storage:', document.file_path);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      console.error('Error downloading document:', downloadError);
      return NextResponse.json(
        { error: `Failed to download document: ${downloadError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('Document downloaded successfully:', {
      size: fileData.size,
      type: fileData.type,
    });

    // Convert file to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify buffer is not empty
    if (buffer.length === 0) {
      console.error('Downloaded file is empty');
      return NextResponse.json(
        { error: 'Downloaded document is empty' },
        { status: 500 }
      );
    }

    // Determine mime type from file name
    const extension = document.file_name.split('.').pop()?.toLowerCase();
    let mimeType = 'image/jpeg';
    if (extension === 'png') mimeType = 'image/png';
    else if (extension === 'pdf') mimeType = 'application/pdf';
    else if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';

    // Override with actual blob type if available and not generic
    if (fileData.type && fileData.type !== 'application/octet-stream') {
      mimeType = fileData.type;
    }

    console.log('Processing document with AI:', {
      fileName: document.file_name,
      mimeType,
      bufferSize: buffer.length,
      bufferSizeMB: (buffer.length / 1024 / 1024).toFixed(2),
    });

    // Verify document using AI
    const verificationResult = await verifyDocumentFile(
      buffer,
      mimeType,
      document.document_type,
      user
    );

    console.log('AI verification complete:', verificationResult);

    // Update document with verification results
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        ai_verified: true,
        ai_summary: verificationResult.summary,
        ai_discrepancies: verificationResult.discrepancies,
        confidence_level: verificationResult.confidenceLevel,
        verification_date: new Date().toISOString(),
        extracted_data: verificationResult.extractedData,
      })
      .eq('documents_id', documentId);

    if (updateError) {
      console.error('Error updating document:', updateError);
      return NextResponse.json(
        { error: 'Failed to save verification results' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Document verified successfully',
      verification: verificationResult,
    });
  } catch (error) {
    console.error('Error in document verification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/documents/verify?userId=xxx
 * Get verification status for all documents of a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch all documents for the user with verification data
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    // Calculate overall verification status
    const totalDocuments = documents?.length || 0;
    const verifiedDocuments = documents?.filter(d => d.ai_verified).length || 0;
    const highConfidence = documents?.filter(d => d.confidence_level === 'high').length || 0;
    const mediumConfidence = documents?.filter(d => d.confidence_level === 'medium').length || 0;
    const lowConfidence = documents?.filter(d => d.confidence_level === 'low').length || 0;

    return NextResponse.json({
      documents: documents || [],
      summary: {
        total: totalDocuments,
        verified: verifiedDocuments,
        pending: totalDocuments - verifiedDocuments,
        highConfidence,
        mediumConfidence,
        lowConfidence,
      },
    });
  } catch (error) {
    console.error('Error fetching verification data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
