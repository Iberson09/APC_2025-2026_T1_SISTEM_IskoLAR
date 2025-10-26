"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  PlusIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import type { Release } from '@/lib/types/release';
import dynamic from 'next/dynamic';

const ScheduleReleaseModal = dynamic(
  () => import('@/app/components/admin/releases/ScheduleReleaseModal'),
  { ssr: false }
);

const CancelConfirmationModal = dynamic(
  () => import('@/app/components/admin/releases/CancelConfirmationModal'),
  { ssr: false }
);

const FilterModal = dynamic(
  () => import('@/app/components/admin/releases/FilterModal'),
  { ssr: false }
);

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [releaseToCancel, setReleaseToCancel] = useState<Release | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    selectedBarangay: '',
    releaseType: ''
  });

  const fetchReleases = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/releases');
      if (!response.ok) throw new Error('Failed to fetch releases');
      const data = await response.json();
      setReleases(data);
    } catch (error) {
      console.error('Error fetching releases:', error);
      alert('Failed to load releases');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const filteredReleases = useMemo(() => {
    return releases.filter((release) => {
      const searchMatch = !searchQuery.trim() || [
        release.releasetype,
        release.location,
        release.barangay
      ].some(field => 
        field?.toString().toLowerCase().includes(searchQuery.toLowerCase())
      );

      const barangayMatch = !filters.selectedBarangay || 
        release.barangay?.toLowerCase() === filters.selectedBarangay.toLowerCase();

      const typeMatch = !filters.releaseType || 
        release.releasetype?.toLowerCase() === filters.releaseType.toLowerCase();

      return searchMatch && barangayMatch && typeMatch;
    });
  }, [releases, searchQuery, filters.selectedBarangay, filters.releaseType]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyFilters = () => {
    // Filters are automatically applied through useMemo
    setShowFilterModal(false);
  };

  const handleCancel = async (releaseId: number) => {
    try {
      const response = await fetch(`/api/releases/${releaseId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete release');
      await fetchReleases();
      setIsConfirmOpen(false);
      setReleaseToCancel(null);
    } catch (error) {
      console.error('Error cancelling release:', error);
      alert('Failed to cancel release');
    }
  };

  return (
    <div className="px-8 pt-6 pb-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-gray-900">Releases</h1>
          <p className="text-sm text-gray-500">Manage scholarship fund releases</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative w-72">
            <input
              type="text"
              placeholder="Search releases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-sm transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Releases</h2>
              <span className="px-2.5 py-0.5 text-sm bg-blue-100 text-blue-600 rounded-full">{filteredReleases.length} total</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilterModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-500" />
                Filter
              </button>

              <button
                onClick={() => {
                  setEditingRelease(null);
                  setShowScheduleModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Schedule Release
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-4 text-center text-gray-500">Loading...</div>
        ) : filteredReleases.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Releases</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by scheduling a new release.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₱)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReleases.map((release) => {
                  // Determine if the release date/time is already past
                  const releaseDateTime = new Date(`${release.releasedate}T${release.releasetime}`);
                  const isPast = new Date() > releaseDateTime;

                  return (
                    <tr key={release.releaseid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900 capitalize">{release.releasetype}</div>
                          {isPast && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Done</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{release.releasedate}</div>
                        <div className="text-sm text-gray-500">{release.releasetime}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{release.location || '—'}</div>
                        {release.barangay && <div className="text-sm text-gray-500">{release.barangay}</div>}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {release.amountperstudent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{release.numberofrecipients}</td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                        {isPast ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-600">Done</span>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingRelease(release);
                                setShowScheduleModal(true);
                              }}
                              className="cursor-pointer text-yellow-600 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-3 py-1 rounded-md"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => {
                                setReleaseToCancel(release);
                                setIsConfirmOpen(true);
                              }}
                              className="ml-4 cursor-pointer text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showScheduleModal && (
        <ScheduleReleaseModal
          onClose={() => {
            setShowScheduleModal(false);
            setEditingRelease(null);
          }}
          release={editingRelease || undefined}
          onSuccess={() => {
            fetchReleases();
            setShowScheduleModal(false);
            setEditingRelease(null);
          }}
        />
      )}

      {isConfirmOpen && releaseToCancel && (
        <CancelConfirmationModal
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setReleaseToCancel(null);
          }}
          onConfirm={() => handleCancel(releaseToCancel.releaseid)}
          release={releaseToCancel}
        />
      )}

      {showFilterModal && (
        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleApplyFilters}
        />
      )}
    </div>
  );
}