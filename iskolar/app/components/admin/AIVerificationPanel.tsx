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
      const response = await fetch(`/api/admin/documents/verify?userId=${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch verification data');
      }

      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error fetching verification data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load verification data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDocument = async (documentId: string) => {
    try {
      setVerifying(documentId);
      setError(null);

      const response = await fetch('/api/admin/documents/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify document');
      }

      // Refresh data
      await fetchVerificationData();
      
      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (err) {
      console.error('Error verifying document:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify document');
    } finally {
      setVerifying(null);
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
        <div className="text-sm text-gray-500">
          {documents.filter(d => d.ai_verified).length} / {documents.length} verified
        </div>
      </div>

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
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                {getConfidenceIcon(doc.confidence_level)}
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{doc.document_type}</h4>
                  <p className="text-xs text-gray-500 mt-1">{doc.file_name}</p>
                </div>
              </div>

              {!doc.ai_verified ? (
                <button
                  onClick={() => handleVerifyDocument(doc.documents_id)}
                  disabled={verifying === doc.documents_id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying === doc.documents_id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />
                      Verify with AI
                    </>
                  )}
                </button>
              ) : (
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium border rounded-full ${getConfidenceColor(doc.confidence_level)}`}>
                  {doc.confidence_level?.toUpperCase()} CONFIDENCE
                </span>
              )}
            </div>

            {/* AI Summary */}
            {doc.ai_verified && doc.ai_summary && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4 text-blue-500" />
                  AI Analysis
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{doc.ai_summary}</p>
                
                {doc.verification_date && (
                  <p className="text-xs text-gray-400 mt-2">
                    Verified on {new Date(doc.verification_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Discrepancies */}
            {doc.ai_verified && doc.ai_discrepancies && doc.ai_discrepancies.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                  Discrepancies Found ({doc.ai_discrepancies.length})
                </p>
                <div className="space-y-2">
                  {doc.ai_discrepancies.map((disc, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-md border text-sm ${
                        disc.severity === 'high'
                          ? 'bg-red-50 border-red-200'
                          : disc.severity === 'medium'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-gray-900">{disc.field}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          disc.severity === 'high'
                            ? 'bg-red-100 text-red-700'
                            : disc.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {disc.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs mb-2">{disc.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Expected:</span>
                          <p className="font-medium text-gray-700 mt-0.5">{disc.expectedValue}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Found:</span>
                          <p className="font-medium text-gray-700 mt-0.5">{disc.foundValue}</p>
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
