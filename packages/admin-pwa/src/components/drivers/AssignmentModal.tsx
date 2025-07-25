'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  licensePlate: string;
  status: 'available' | 'on_delivery' | 'break' | 'offline';
  currentLocation: string;
  completedToday: number;
  totalDeliveries: number;
  rating: number;
  joinedDate: string;
}

interface PendingInquiry {
  id: string;
  customerName: string;
  phone: string;
  service: string;
  pickup: string;
  delivery: string;
  priority: 'normal' | 'urgent' | 'express';
  estimatedValue: string;
  preferredTime: string;
  description: string;
  createdAt: string;
}

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDriver?: Driver;
  onAssignDelivery: (driverId: string, inquiryId: string) => void;
}

// Mock data for pending inquiries
const pendingInquiries: PendingInquiry[] = [
  {
    id: 'INQ-2024-001',
    customerName: 'Sarah Johnson',
    phone: '+971-50-123-4567',
    service: 'Same-Day Delivery',
    pickup: 'Dubai Mall, Downtown Dubai',
    delivery: 'Business Bay Tower, Business Bay',
    priority: 'urgent',
    estimatedValue: 'AED 45',
    preferredTime: 'Today before 5 PM',
    description: 'Fragile electronics package, requires careful handling',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'INQ-2024-002',
    customerName: 'Mohammed Al Rashid',
    phone: '+971-56-789-0123',
    service: 'Document Delivery',
    pickup: 'DIFC Gate District',
    delivery: 'Abu Dhabi Mall, Abu Dhabi',
    priority: 'express',
    estimatedValue: 'AED 120',
    preferredTime: 'Tomorrow morning',
    description: 'Legal documents for court filing, urgent delivery required',
    createdAt: '2024-01-15T09:15:00Z',
  },
  {
    id: 'INQ-2024-003',
    customerName: 'Fatima Hassan',
    phone: '+971-52-456-7890',
    service: 'Fragile Items',
    pickup: 'Sharjah City Centre, Sharjah',
    delivery: 'Ajman City Centre, Ajman',
    priority: 'normal',
    estimatedValue: 'AED 85',
    preferredTime: 'This weekend',
    description: 'Ceramic vase collection, multiple items',
    createdAt: '2024-01-15T08:45:00Z',
  },
];

// Mock available drivers
const availableDrivers: Driver[] = [
  {
    id: 'DRV-002',
    name: 'Ahmed Ali',
    phone: '+971-56-789-0123',
    email: 'ahmed.ali@deliveryuae.com',
    vehicle: 'Toyota Corolla',
    licensePlate: 'DXB-B-67890',
    status: 'available',
    currentLocation: 'Dubai Mall',
    completedToday: 12,
    totalDeliveries: 2100,
    rating: 4.8,
    joinedDate: '2023-01-20',
  },
  {
    id: 'DRV-005',
    name: 'Ali Mohammed',
    phone: '+971-55-234-5678',
    email: 'ali.mohammed@deliveryuae.com',
    vehicle: 'KIA Cerato',
    licensePlate: 'DXB-E-13579',
    status: 'available',
    currentLocation: 'Deira City Centre',
    completedToday: 9,
    totalDeliveries: 1430,
    rating: 4.8,
    joinedDate: '2023-04-18',
  },
];

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  urgent: 'bg-red-100 text-red-800',
  express: 'bg-purple-100 text-purple-800',
};

export function AssignmentModal({
  isOpen,
  onClose,
  selectedDriver,
  onAssignDelivery,
}: AssignmentModalProps) {
  const [selectedInquiry, setSelectedInquiry] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>(selectedDriver?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInquiries = pendingInquiries.filter(inquiry =>
    inquiry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inquiry.pickup.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inquiry.delivery.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = () => {
    if (selectedDriverId && selectedInquiry) {
      onAssignDelivery(selectedDriverId, selectedInquiry);
      onClose();
      setSelectedInquiry('');
      setSelectedDriverId('');
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900"
                    >
                      Assign Delivery
                    </Dialog.Title>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600"
                      onClick={onClose}
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Select Driver */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        Select Driver
                      </h4>
                      
                      {selectedDriver ? (
                        <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {selectedDriver.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {selectedDriver.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {selectedDriver.vehicle} • {selectedDriver.licensePlate}
                              </p>
                              <p className="text-sm text-gray-500">
                                Location: {selectedDriver.currentLocation}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center text-yellow-400">
                                <span className="text-sm font-medium text-gray-900 mr-1">
                                  {selectedDriver.rating}
                                </span>
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </div>
                              <p className="text-xs text-gray-500">
                                {selectedDriver.completedToday} today
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {availableDrivers.map((driver) => (
                            <div
                              key={driver.id}
                              className={clsx(
                                'border rounded-lg p-4 cursor-pointer transition-colors',
                                selectedDriverId === driver.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              )}
                              onClick={() => setSelectedDriverId(driver.id)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm">
                                    {driver.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {driver.name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {driver.vehicle} • {driver.currentLocation}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center text-yellow-400">
                                    <span className="text-sm font-medium text-gray-900 mr-1">
                                      {driver.rating}
                                    </span>
                                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {driver.completedToday} today
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Column - Select Inquiry */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-900">
                          Select Inquiry
                        </h4>
                        <div className="relative">
                          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search inquiries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredInquiries.map((inquiry) => (
                          <div
                            key={inquiry.id}
                            className={clsx(
                              'border rounded-lg p-4 cursor-pointer transition-colors',
                              selectedInquiry === inquiry.id
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                            onClick={() => setSelectedInquiry(inquiry.id)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {inquiry.customerName}
                                </p>
                                <p className="text-sm text-gray-500 font-mono">
                                  {inquiry.id}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={clsx(
                                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                    priorityColors[inquiry.priority]
                                  )}
                                >
                                  {inquiry.priority === 'urgent' && (
                                    <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                  )}
                                  {inquiry.priority}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-start space-x-2">
                                <MapPinIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">From:</span> {inquiry.pickup}
                                </div>
                              </div>
                              <div className="flex items-start space-x-2">
                                <MapPinIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">To:</span> {inquiry.delivery}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <ClockIcon className="w-4 h-4 text-blue-500" />
                                  <span className="text-gray-600">{inquiry.preferredTime}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <CurrencyDollarIcon className="w-4 h-4 text-yellow-500" />
                                  <span className="font-medium text-gray-900">
                                    {inquiry.estimatedValue}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                {inquiry.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleAssign}
                    disabled={!selectedDriverId || !selectedInquiry}
                  >
                    Assign Delivery
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}