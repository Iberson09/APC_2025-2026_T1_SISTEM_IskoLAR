"use client";
import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface AIVerificationSummaryProps {
  userId: string;
}

interface VerificationStats {
  total: number;
  verified: number;
  pending: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
}

export default function AIVerificationSummary({ userId }: AIVerificationSummaryProps) {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/documents/verify?userId=${userId}`);
      const data = await response.json();

      if (response.ok && data.summary) {
        setStats(data.summary);
      }
    } catch (err) {
      console.error('Error fetching AI verification stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="h-5 w-5 text-blue-600 animate-pulse" />
          <h4 className="text-sm font-semibold text-gray-900">AI Document Verification</h4>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <SparklesIcon className="h-5 w-5 text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-900">AI Document Verification</h4>
        </div>
        <p className="text-sm text-gray-500">No documents to verify</p>
      </div>
    );
  }

  const verificationProgress = (stats.verified / stats.total) * 100;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-900">AI Document Verification</h4>
        </div>
        {stats.verified === stats.total && (
          <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <CheckCircleIcon className="h-3 w-3" />
            <span className="font-medium">Complete</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">Verification Progress</span>
          <span className="text-xs font-bold text-gray-900">{stats.verified} / {stats.total}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              verificationProgress === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${verificationProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-900">High</span>
          </div>
          <p className="text-xl font-bold text-green-600">{stats.highConfidence}</p>
          <p className="text-xs text-green-700">Perfect match</p>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-900">Medium</span>
          </div>
          <p className="text-xl font-bold text-yellow-600">{stats.mediumConfidence}</p>
          <p className="text-xs text-yellow-700">Minor issues</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <XCircleIcon className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium text-red-900">Low</span>
          </div>
          <p className="text-xl font-bold text-red-600">{stats.lowConfidence}</p>
          <p className="text-xs text-red-700">Needs review</p>
        </div>
      </div>

      {/* Overall Status */}
      {stats.verified === stats.total && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-700">
            {stats.lowConfidence > 0 ? (
              <span className="font-medium text-red-600">⚠️ {stats.lowConfidence} document{stats.lowConfidence > 1 ? 's' : ''} require{stats.lowConfidence === 1 ? 's' : ''} manual review</span>
            ) : stats.mediumConfidence > 0 ? (
              <span className="font-medium text-yellow-600">✓ All documents verified. {stats.mediumConfidence} with minor discrepancies.</span>
            ) : (
              <span className="font-medium text-green-600">✓ All documents verified successfully with high confidence!</span>
            )}
          </p>
        </div>
      )}

      {stats.pending > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700">
            <span className="font-medium">⏳ {stats.pending} document{stats.pending > 1 ? 's' : ''} pending verification</span>
          </p>
        </div>
      )}
    </div>
  );
}
