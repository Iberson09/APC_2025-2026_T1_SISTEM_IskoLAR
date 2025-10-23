'use client';

import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { Release } from '@/lib/types/release';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  release: Release;
}

export default function CancelConfirmationModal({ isOpen, onClose, onConfirm, release }: Props) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <Dialog.Title className="text-lg font-semibold">
              Delete Release
            </Dialog.Title>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Are you sure you want to delete this release? This action cannot be undone.
          </p>

          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <div className="text-sm">
              <p><span className="font-medium">Type:</span> {release.releasetype}</p>
              <p><span className="font-medium">Date:</span> {release.releasedate}</p>
              <p><span className="font-medium">Amount:</span> ₱{release.amountperstudent.toLocaleString('en-PH', { minimumFractionDigits: 2 })} × {release.numberofrecipients} recipients</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Delete Release
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}