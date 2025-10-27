"use client";
import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface Discrepancy {
  field: string;
  expectedValue: string;
  foundValue: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface DocumentVerification {
  documents_id: string;
  document_type: string;
  file_name: string;
  ai_verified: boolean;
  ai_summary: string | null;
  ai_discrepancies: Discrepancy[] | null;
  confidence_level: 'low' | 'medium' | 'high' | null;
  verification_date: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extracted_data: any;
}

interface AIVerificationPanelProps {
  userId: string;
  onVerificationComplete?: () => void;
}

export default function AIVerificationPanel({ userId, onVerificationComplete }: AIVerificationPanelProps) {
  const [documents, setDocuments] = useState<DocumentVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVerificationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchVerificationData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching verification data for user:', userId);
      const response = await fetch(`/api/admin/documents/verify?userId=${userId}`);
      const data = await response.json();

      console.log('Verification data received:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch verification data');
      }

      const docs = data.documents || [];
      setDocuments(docs);
      setIsLoading(false);

      // Auto-verify unverified documents
      const unverifiedDocs = docs.filter((doc: DocumentVerification) => !doc.ai_verified);
      console.log('Unverified documents:', unverifiedDocs.map((d: DocumentVerification) => ({ id: d.documents_id, type: d.document_type, verified: d.ai_verified })));
      
      if (unverifiedDocs.length > 0) {
        console.log(`🚀 Starting auto-verification for ${unverifiedDocs.length} documents...`);
        
        // Start verifying immediately in background
        verifyDocumentsInBackground(unverifiedDocs);
      } else {
        console.log('✅ All documents already verified');
      }
    } catch (err) {
      console.error('Error fetching verification data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load verification data');
      setIsLoading(false);
    }
  };

  const verifyDocumentsInBackground = async (docs: DocumentVerification[]) => {
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      try {
        console.log(`📄 [${i + 1}/${docs.length}] Verifying: ${doc.document_type} (ID: ${doc.documents_id})`);
        setVerifying(doc.documents_id);
        
        await handleVerifyDocument(doc.documents_id, true);
        
        console.log(`✅ [${i + 1}/${docs.length}] Verified: ${doc.document_type}`);
        setVerifying(null);
        
        // Wait 2 seconds before next verification
        if (i < docs.length - 1) {
          console.log(`⏳ Waiting 2 seconds before next verification...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (err) {
        console.error(`❌ Failed to verify ${doc.document_type}:`, err);
        setVerifying(null);
      }
    }
    
    console.log('🏁 All auto-verifications complete, refreshing data...');
    await fetchDocumentsOnly();
  };

  // Helper function to just fetch documents without triggering auto-verify
  const fetchDocumentsOnly = async () => {
    try {
      const response = await fetch(`/api/admin/documents/verify?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error refreshing documents:', err);
    }
  };

  const handleVerifyDocument = async (documentId: string, isAutoVerify = false) => {
    try {
      if (!isAutoVerify) {
        setVerifying(documentId);
      }
      setError(null);

      console.log(`🔄 Calling verification API for document: ${documentId}`);
      
      const response = await fetch('/api/admin/documents/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });

      const data = await response.json();
      console.log(`📥 API Response:`, { ok: response.ok, status: response.status, data });

      if (!response.ok) {
        console.error(`❌ API Error:`, data.error);
        throw new Error(data.error || 'Failed to verify document');
      }

      // Update the specific document in state with verification data
      if (data.verification) {
        console.log(`✅ Updating document ${documentId} with verification data`);
        setDocuments(prev => prev.map(doc => 
          doc.documents_id === documentId 
            ? { 
                ...doc, 
                ai_verified: data.verification.ai_verified,
                ai_summary: data.verification.ai_summary,
                ai_discrepancies: data.verification.ai_discrepancies,
                confidence_level: data.verification.confidence_level,
                verification_date: data.verification.verification_date,
                extracted_data: data.verification.extracted_data,
              }
            : doc
        ));
        console.log(`✅ Document ${documentId} updated in state`);
      } else {
        console.warn(`⚠️ No verification data in response for ${documentId}`);
      }

      // Refresh data only if not auto-verifying
      if (!isAutoVerify && onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (err) {
      console.error(`❌ Error verifying document ${documentId}:`, err);
      if (!isAutoVerify) {
        setError(err instanceof Error ? err.message : 'Failed to verify document');
      }
      throw err; // Re-throw so the background verifier knows it failed
    } finally {
      if (!isAutoVerify) {
        setVerifying(null);
      }
    }
  };

  const getConfidenceColor = (level: string | null) => {
    switch (level) {
      case 'high':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceIcon = (level: string | null) => {
    switch (level) {
      case 'high':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'medium':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <SparklesIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-600">Loading AI verification data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Document Verification</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-medium text-gray-700">Progress: </span>
            <span className={`font-semibold ${
              documents.filter(d => d.ai_verified).length === documents.length
                ? 'text-green-600'
                : 'text-blue-600'
            }`}>
              {documents.filter(d => d.ai_verified).length} / {documents.length} verified
            </span>
          </div>
          {documents.filter(d => !d.ai_verified).length > 0 && (
            <button
              onClick={async () => {
                const unverified = documents.filter(d => !d.ai_verified);
                for (const doc of unverified) {
                  try {
                    await handleVerifyDocument(doc.documents_id, true);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  } catch (err) {
                    console.error(`Failed to verify ${doc.documents_id}:`, err);
                  }
                }
                await fetchDocumentsOnly();
              }}
              disabled={verifying !== null}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-4 w-4" />
              Verify All Remaining
            </button>
          )}
          {documents.filter(d => d.ai_verified).length === documents.length && documents.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <CheckCircleIcon className="h-4 w-4" />
              <span className="font-medium">All Verified</span>
            </div>
          )}
        </div>
      </div>

      {/* Overall Status Summary */}
      {documents.length > 0 && documents.some(d => d.ai_verified) && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">High Confidence</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {documents.filter(d => d.confidence_level === 'high').length}
            </p>
            <p className="text-xs text-green-700">Documents match perfectly</p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Medium Confidence</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {documents.filter(d => d.confidence_level === 'medium').length}
            </p>
            <p className="text-xs text-yellow-700">Minor discrepancies found</p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircleIcon className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Low Confidence</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {documents.filter(d => d.confidence_level === 'low').length}
            </p>
            <p className="text-xs text-red-700">Requires manual review</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.documents_id}
            className={`bg-white border-2 rounded-lg p-5 transition-all ${
              doc.confidence_level === 'high'
                ? 'border-green-300 hover:shadow-lg hover:border-green-400'
                : doc.confidence_level === 'medium'
                ? 'border-yellow-300 hover:shadow-lg hover:border-yellow-400'
                : doc.confidence_level === 'low'
                ? 'border-red-300 hover:shadow-lg hover:border-red-400'
                : 'border-gray-200 hover:shadow-md hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  doc.confidence_level === 'high'
                    ? 'bg-green-100'
                    : doc.confidence_level === 'medium'
                    ? 'bg-yellow-100'
                    : doc.confidence_level === 'low'
                    ? 'bg-red-100'
                    : 'bg-gray-100'
                }`}>
                  {getConfidenceIcon(doc.confidence_level)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{doc.document_type}</h4>
                    {doc.ai_verified && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full ${getConfidenceColor(doc.confidence_level)}`}>
                        {doc.confidence_level === 'high' && '✓ VERIFIED'}
                        {doc.confidence_level === 'medium' && '⚠ REVIEW'}
                        {doc.confidence_level === 'low' && '✗ ISSUES FOUND'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{doc.file_name}</p>
                  {!doc.ai_verified && verifying === doc.documents_id && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-xs text-blue-600 font-medium">Analyzing document with AI...</span>
                    </div>
                  )}
                </div>
              </div>

              {!doc.ai_verified && verifying !== doc.documents_id && (
                <button
                  onClick={() => handleVerifyDocument(doc.documents_id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Verify Now
                </button>
              )}
            </div>

            {/* AI Summary - More Prominent */}
            {doc.ai_verified && doc.ai_summary && (
              <div className={`mt-4 p-4 rounded-lg border-l-4 ${
                doc.confidence_level === 'high'
                  ? 'bg-green-50 border-green-500'
                  : doc.confidence_level === 'medium'
                  ? 'bg-yellow-50 border-yellow-500'
                  : 'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-start gap-2 mb-2">
                  <SparklesIcon className={`h-5 w-5 mt-0.5 ${
                    doc.confidence_level === 'high'
                      ? 'text-green-600'
                      : doc.confidence_level === 'medium'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`} />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold mb-1 ${
                      doc.confidence_level === 'high'
                        ? 'text-green-900'
                        : doc.confidence_level === 'medium'
                        ? 'text-yellow-900'
                        : 'text-red-900'
                    }`}>
                      AI Analysis Summary
                    </p>
                    <p className={`text-sm leading-relaxed ${
                      doc.confidence_level === 'high'
                        ? 'text-green-800'
                        : doc.confidence_level === 'medium'
                        ? 'text-yellow-800'
                        : 'text-red-800'
                    }`}>
                      {doc.ai_summary}
                    </p>
                  </div>
                </div>
                
                {doc.verification_date && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <span>✓</span>
                    Verified {new Date(doc.verification_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Discrepancies */}
            {doc.ai_verified && doc.ai_discrepancies && doc.ai_discrepancies.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                  <p className="text-sm font-semibold text-gray-900">
                    {doc.ai_discrepancies.length} Issue{doc.ai_discrepancies.length > 1 ? 's' : ''} Detected
                  </p>
                </div>
                <div className="space-y-3">
                  {doc.ai_discrepancies.map((disc, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 ${
                        disc.severity === 'high'
                          ? 'bg-red-50 border-red-500'
                          : disc.severity === 'medium'
                          ? 'bg-yellow-50 border-yellow-500'
                          : 'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-sm font-bold ${
                          disc.severity === 'high'
                            ? 'text-red-900'
                            : disc.severity === 'medium'
                            ? 'text-yellow-900'
                            : 'text-blue-900'
                        }`}>
                          {disc.field}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                          disc.severity === 'high'
                            ? 'bg-red-200 text-red-900'
                            : disc.severity === 'medium'
                            ? 'bg-yellow-200 text-yellow-900'
                            : 'bg-blue-200 text-blue-900'
                        }`}>
                          {disc.severity === 'high' ? '🔴 Critical' : disc.severity === 'medium' ? '🟡 Warning' : '🔵 Note'}
                        </span>
                      </div>
                      <p className={`text-sm mb-3 ${
                        disc.severity === 'high'
                          ? 'text-red-800'
                          : disc.severity === 'medium'
                          ? 'text-yellow-800'
                          : 'text-blue-800'
                      }`}>
                        {disc.description}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-2 rounded ${
                          disc.severity === 'high'
                            ? 'bg-red-100'
                            : disc.severity === 'medium'
                            ? 'bg-yellow-100'
                            : 'bg-blue-100'
                        }`}>
                          <span className="text-xs font-medium text-gray-600 block mb-1">Expected:</span>
                          <p className="text-sm font-semibold text-gray-900">{disc.expectedValue}</p>
                        </div>
                        <div className={`p-2 rounded ${
                          disc.severity === 'high'
                            ? 'bg-red-100'
                            : disc.severity === 'medium'
                            ? 'bg-yellow-100'
                            : 'bg-blue-100'
                        }`}>
                          <span className="text-xs font-medium text-gray-600 block mb-1">Found in Document:</span>
                          <p className="text-sm font-semibold text-gray-900">{disc.foundValue}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Data Preview */}
            {doc.ai_verified && doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
              <details className="mt-3">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  View Extracted Data
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 text-xs">
                  <pre className="whitespace-pre-wrap text-gray-600">
                    {JSON.stringify(doc.extracted_data, null, 2)}
                  </pre>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <SparklesIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p>No documents found to verify</p>
        </div>
      )}
    </div>
  );
}
