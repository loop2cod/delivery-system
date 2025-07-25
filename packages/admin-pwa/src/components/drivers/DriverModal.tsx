'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  StarIcon,
  CalendarIcon,
  IdentificationIcon,
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
  avatar?: string;
  currentDelivery?: {
    id: string;
    customer: string;
    destination: string;
    estimatedTime: string;
  };
}

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  onContactDriver: (driver: Driver) => void;
  onAssignDelivery: (driver: Driver) => void;
  onViewLocation: (driver: Driver) => void;
  onUpdateStatus: (driver: Driver, status: string) => void;
}

const statusColors = {
  available: 'bg-green-100 text-green-800',
  on_delivery: 'bg-blue-100 text-blue-800',
  break: 'bg-yellow-100 text-yellow-800',
  offline: 'bg-gray-100 text-gray-800',
};

const statusIcons = {
  available: CheckCircleIcon,
  on_delivery: TruckIcon,
  break: ClockIcon,
  offline: ClockIcon,
};

export function DriverModal({
  isOpen,
  onClose,
  driver,
  onContactDriver,
  onAssignDelivery,
  onViewLocation,
  onUpdateStatus,
}: DriverModalProps) {
  if (!driver) return null;

  const StatusIcon = statusIcons[driver.status];
  const joinedDate = new Date(driver.joinedDate);

  // Mock recent deliveries
  const recentDeliveries = [
    {
      id: 'PKG-2024-003',
      customer: 'Laila Abdullah',
      destination: 'Marina Mall',
      completedAt: '2024-01-15T14:30:00Z',
      rating: 5,
    },
    {
      id: 'PKG-2024-002',
      customer: 'Ahmed Khalil',
      destination: 'DIFC Gate',
      completedAt: '2024-01-15T12:15:00Z',
      rating: 4,
    },
    {
      id: 'PKG-2024-001',
      customer: 'Sarah Johnson',
      destination: 'Business Bay',
      completedAt: '2024-01-15T10:45:00Z',
      rating: 5,
    },
  ];

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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {driver.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <Dialog.Title
                          as="h3"
                          className="text-xl font-semibold leading-6 text-gray-900"
                        >
                          {driver.name}
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 font-mono">
                          {driver.id}
                        </p>
                        <div className="flex items-center mt-1">
                          <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-900 ml-1">
                            {driver.rating}
                          </span>
                          <span className="text-sm text-gray-500 ml-1">
                            ({driver.totalDeliveries} deliveries)
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span
                        className={clsx(
                          'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize',
                          statusColors[driver.status]
                        )}
                      >
                        <StatusIcon className="w-4 h-4 mr-2" />
                        {driver.status.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={onClose}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Driver Info */}
                    <div className="space-y-6">
                      {/* Contact Information */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                          Contact Information
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <PhoneIcon className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Phone</p>
                              <p className="text-sm text-gray-600">{driver.phone}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Email</p>
                              <p className="text-sm text-gray-600">{driver.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <MapPinIcon className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Current Location</p>
                              <p className="text-sm text-gray-600">{driver.currentLocation}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Information */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                          Vehicle Information
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <TruckIcon className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Vehicle</p>
                              <p className="text-sm text-gray-600">{driver.vehicle}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <IdentificationIcon className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">License Plate</p>
                              <p className="text-sm text-gray-600 font-mono">{driver.licensePlate}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <CalendarIcon className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Joined Date</p>
                              <p className="text-sm text-gray-600">
                                {joinedDate.toLocaleDateString('en-AE', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Performance Stats */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                          Performance Stats
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-blue-800">Today</p>
                            <p className="text-lg font-semibold text-blue-900">
                              {driver.completedToday}
                            </p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-green-800">Total</p>
                            <p className="text-lg font-semibold text-green-900">
                              {driver.totalDeliveries}
                            </p>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-yellow-800">Rating</p>
                            <p className="text-lg font-semibold text-yellow-900">
                              {driver.rating}/5.0
                            </p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-purple-800">Experience</p>
                            <p className="text-lg font-semibold text-purple-900">
                              {Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Current Activity & Recent Deliveries */}
                    <div className="space-y-6">
                      {/* Current Delivery */}
                      {driver.currentDelivery && (
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">
                            Current Delivery
                          </h4>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-blue-900">
                                Package {driver.currentDelivery.id}
                              </p>
                              <span className="text-xs text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
                                In Transit
                              </span>
                            </div>
                            <p className="text-sm text-blue-800">
                              Customer: {driver.currentDelivery.customer}
                            </p>
                            <p className="text-sm text-blue-800">
                              Destination: {driver.currentDelivery.destination}
                            </p>
                            <p className="text-sm text-blue-700 mt-2">
                              ETA: {driver.currentDelivery.estimatedTime}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Recent Deliveries */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                          Recent Deliveries
                        </h4>
                        <div className="space-y-3">
                          {recentDeliveries.map((delivery) => (
                            <div
                              key={delivery.id}
                              className="border border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-900">
                                  {delivery.id}
                                </p>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <StarIcon
                                      key={i}
                                      className={clsx(
                                        'h-3 w-3',
                                        i < delivery.rating
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-gray-300'
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">
                                {delivery.customer} → {delivery.destination}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Completed: {new Date(delivery.completedAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status Update */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                          Update Status
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {(['available', 'break', 'offline'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => onUpdateStatus(driver, status)}
                              className={clsx(
                                'px-3 py-2 text-sm font-medium rounded-md border transition-colors',
                                driver.status === status
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              )}
                              disabled={driver.status === status}
                            >
                              {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      onClick={() => onContactDriver(driver)}
                    >
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      Call Driver
                    </button>
                    
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      onClick={() => onViewLocation(driver)}
                    >
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      View Location
                    </button>
                    
                    {driver.status === 'available' && (
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                        onClick={() => onAssignDelivery(driver)}
                      >
                        <TruckIcon className="h-4 w-4 mr-2" />
                        Assign Delivery
                      </button>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                  >
                    Close
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