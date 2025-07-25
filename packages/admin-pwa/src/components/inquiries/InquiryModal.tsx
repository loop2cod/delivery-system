'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface Inquiry {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  service: string;
  pickup: string;
  delivery: string;
  priority: 'normal' | 'urgent' | 'express';
  status: 'new' | 'contacted' | 'quoted' | 'assigned' | 'completed' | 'cancelled';
  createdAt: string;
  estimatedValue: string;
  description: string;
  preferredTime: string;
}

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry | null;
  onContactCustomer: (inquiry: Inquiry) => void;
  onAcceptInquiry: (inquiry: Inquiry) => void;
  onDeclineInquiry: (inquiry: Inquiry) => void;
  onAssignDriver: (inquiry: Inquiry) => void;
}

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  urgent: 'bg-red-100 text-red-800',
  express: 'bg-purple-100 text-purple-800',
};

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-indigo-100 text-indigo-800',
  assigned: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const priorityIcons = {
  normal: ClockIcon,
  urgent: ExclamationTriangleIcon,
  express: CheckCircleIcon,
};

export function InquiryModal({
  isOpen,
  onClose,
  inquiry,
  onContactCustomer,
  onAcceptInquiry,
  onDeclineInquiry,
  onAssignDriver,
}: InquiryModalProps) {
  if (!inquiry) return null;

  const PriorityIcon = priorityIcons[inquiry.priority];
  const createdDate = new Date(inquiry.createdAt);

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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <Dialog.Title
                          as="h3"
                          className="text-lg font-semibold leading-6 text-gray-900"
                        >
                          {inquiry.customerName}
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 font-mono">
                          {inquiry.id}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                          priorityColors[inquiry.priority]
                        )}
                      >
                        <PriorityIcon className="w-3 h-3 mr-1" />
                        {inquiry.priority}
                      </span>
                      <span
                        className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                          statusColors[inquiry.status]
                        )}
                      >
                        {inquiry.status}
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
                  <div className="space-y-6">
                    {/* Customer Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <PhoneIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Phone</p>
                          <p className="text-sm text-gray-600">{inquiry.phone}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email</p>
                          <p className="text-sm text-gray-600">{inquiry.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Service Details */}
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Service Details
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Service Type</p>
                            <p className="text-sm text-gray-600">{inquiry.service}</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <MapPinIcon className="w-5 h-5 text-green-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Pickup Location</p>
                            <p className="text-sm text-gray-600">{inquiry.pickup}</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <MapPinIcon className="w-5 h-5 text-red-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Delivery Location</p>
                            <p className="text-sm text-gray-600">{inquiry.delivery}</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <ClockIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Preferred Time</p>
                            <p className="text-sm text-gray-600">{inquiry.preferredTime}</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <CurrencyDollarIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Estimated Value</p>
                            <p className="text-sm text-gray-600 font-semibold">{inquiry.estimatedValue}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Description
                      </h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {inquiry.description}
                      </p>
                    </div>

                    {/* Timestamps */}
                    <div className="border-t border-gray-200 pt-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">Created</p>
                          <p className="text-gray-600">
                            {createdDate.toLocaleDateString()} at{' '}
                            {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Last Updated</p>
                          <p className="text-gray-600">
                            {createdDate.toLocaleDateString()} at{' '}
                            {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
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
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      onClick={() => onContactCustomer(inquiry)}
                    >
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      Contact Customer
                    </button>
                    
                    {inquiry.status === 'new' && (
                      <>
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          onClick={() => onAcceptInquiry(inquiry)}
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Accept
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                          onClick={() => onDeclineInquiry(inquiry)}
                        >
                          <XMarkIcon className="h-4 w-4 mr-2" />
                          Decline
                        </button>
                      </>
                    )}
                    
                    {(inquiry.status === 'contacted' || inquiry.status === 'quoted') && (
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                        onClick={() => onAssignDriver(inquiry)}
                      >
                        Assign Driver
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