"use client";

import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const barangayData = [
    { name: "Ayala-Paseo de Roxas", zipCode: "1226" },
    { name: "Bangkal", zipCode: "1233" },
    { name: "Bel-Air", zipCode: "1209" },
    { name: "Cembo", zipCode: "1214" },
    { name: "Comembo", zipCode: "1217" },
    { name: "Dasmarinas Village North", zipCode: "1221" },
    { name: "Dasmarinas Village South", zipCode: "1222" },
    { name: "Forbes Park North", zipCode: "1219" },
    { name: "Forbes Park South", zipCode: "1220" },
    { name: "Fort Bonifacio Naval Station", zipCode: "1202" },
    { name: "Greenbelt", zipCode: "1228" },
    { name: "Guadalupe Nuevo", zipCode: "1212" },
    { name: "Guadalupe Viejo", zipCode: "1211" },
    { name: "Kasilawan", zipCode: "1206" },
    { name: "La Paz Singkamas Tejeros", zipCode: "1204" },
    { name: "Legaspi Village", zipCode: "1229" },
    { name: "Magallanes Village", zipCode: "1232" },
    { name: "Makati Commercial Center", zipCode: "1224" },
    { name: "Makati CPO Inc. Buendia", zipCode: "1200" },
    { name: "Olympia and Carmona", zipCode: "1207" },
    { name: "Palanan", zipCode: "1235" },
    { name: "Pasong Tamo, Ecology Village", zipCode: "1231" },
    { name: "Pembo", zipCode: "1218" },
    { name: "Pinagkaisahan-Pitogo", zipCode: "1213" },
    { name: "Pio del Pilar", zipCode: "1230" },
    { name: "Poblacion", zipCode: "1210" },
    { name: "Rembo (East)", zipCode: "1216" },
    { name: "Rembo (West)", zipCode: "1215" },
    { name: "Salcedo Village", zipCode: "1227" },
    { name: "San Antonio Village", zipCode: "1203" },
    { name: "San Isidro", zipCode: "1234" },
    { name: "San Lorenzo Village", zipCode: "1223" },
    { name: "Sta. Cruz", zipCode: "1205" },
    { name: "Urdaneta Village", zipCode: "1225" },
    { name: "Valenzuela, Santiago, Rizal", zipCode: "1208" }
];

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: {
        selectedBarangay: string;
        releaseType: string;
    };
    onFilterChange: (name: string, value: string) => void;
    onApplyFilters: () => void;
}

export default function FilterModal({ isOpen, onClose, filters, onFilterChange, onApplyFilters }: FilterModalProps) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="div"
                                    className="flex items-center justify-between mb-4"
                                >
                                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                                        Filter Releases
                                    </h3>
                                    <button
                                        onClick={onClose}
                                        className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                                    >
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </Dialog.Title>

                                <div className="mt-4 space-y-4">
                                    {/* Release Type Filter */}
                                    <div>
                                        <label htmlFor="releaseType" className="block text-sm font-medium text-gray-700 mb-1">
                                            Release Type
                                        </label>
                                        <select
                                            id="releaseType"
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            value={filters.releaseType}
                                            onChange={(e) => onFilterChange('releaseType', e.target.value)}
                                        >
                                            <option value="">All Types</option>
                                            <option value="allowance">Allowance</option>
                                            <option value="tuition">Tuition</option>
                                            <option value="books">Books</option>
                                            <option value="miscellaneous">Miscellaneous</option>
                                        </select>
                                    </div>

                                    {/* Barangay Filter */}
                                    <div>
                                        <label htmlFor="barangay" className="block text-sm font-medium text-gray-700 mb-1">
                                            Barangay
                                        </label>
                                        <select
                                            id="barangay"
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            value={filters.selectedBarangay}
                                            onChange={(e) => onFilterChange('selectedBarangay', e.target.value)}
                                        >
                                            <option value="">All Barangays</option>
                                            {barangayData.map((brgy) => (
                                                <option key={brgy.zipCode} value={brgy.name}>
                                                    {brgy.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            type="button"
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                                            onClick={() => {
                                                onApplyFilters();
                                                onClose();
                                            }}
                                        >
                                            Apply Filters
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}