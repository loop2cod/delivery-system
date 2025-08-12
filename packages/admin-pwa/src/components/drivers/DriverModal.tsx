'use client';

import { Fragment, useState } from 'react';
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
  UserIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { Driver, formatDate } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { clsx } from 'clsx';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  onContactDriver: (driver: Driver) => void;
  onUpdateStatus: (driver: Driver, status: Driver['status']) => void;
  onUpdateAvailability: (driver: Driver, availability: Driver['availability_status']) => void;
  onViewLocation: (driver: Driver) => void;
}

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  ON_LEAVE: 'bg-yellow-100 text-yellow-800',
};

const AVAILABILITY_COLORS = {
  AVAILABLE: 'bg-green-100 text-green-800',
  BUSY: 'bg-orange-100 text-orange-800',
  OFFLINE: 'bg-gray-100 text-gray-800',
};

export function DriverModal({
  isOpen,
  onClose,
  driver,
  onContactDriver,
  onUpdateStatus,
  onUpdateAvailability,
  onViewLocation,
}: DriverModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableStatus, setEditableStatus] = useState<Driver['status']>('ACTIVE');
  const [editableAvailability, setEditableAvailability] = useState<Driver['availability_status']>('AVAILABLE');

  if (!driver) return null;

  const joinedDate = formatDate(driver.joined_date);
  const lastActive = formatDate(driver.last_active);
  const licenseExpiry = formatDate(driver.license_expiry);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditableStatus(driver.status);
      setEditableAvailability(driver.availability_status);
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = () => {
    if (editableStatus !== driver.status) {
      onUpdateStatus(driver, editableStatus);
    }
    if (editableAvailability !== driver.availability_status) {
      onUpdateAvailability(driver, editableAvailability);
    }
    setIsEditing(false);
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
                <div className="bg-white px-6 py-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <Dialog.Title
                          as="h3"
                          className="text-xl font-bold leading-6 text-gray-900"
                        >
                          {driver.name}
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 font-mono">
                          ID: {driver.id}
                        </p>
                        <div className="flex items-center mt-1">
                          <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-900 ml-1">
                            {driver.rating}/5
                          </span>
                          <span className="text-sm text-gray-500 ml-1">
                            ({driver.total_deliveries} deliveries)
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {!isEditing ? (
                        <>
                          <Badge variant="secondary" className={STATUS_COLORS[driver.status]}>
                            {driver.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary" className={AVAILABILITY_COLORS[driver.availability_status]}>
                            {driver.availability_status}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <Select value={editableStatus} onValueChange={setEditableStatus}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="INACTIVE">Inactive</SelectItem>
                              <SelectItem value="SUSPENDED">Suspended</SelectItem>
                              <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={editableAvailability} onValueChange={setEditableAvailability}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AVAILABLE">Available</SelectItem>
                              <SelectItem value="BUSY">Busy</SelectItem>
                              <SelectItem value="OFFLINE">Offline</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
                      
                      <Button variant="outline" size="sm" onClick={handleEditToggle}>
                        <PencilIcon className="h-4 w-4 mr-2" />
                        {isEditing ? 'Cancel' : 'Edit'}
                      </Button>
                      
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={onClose}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Personal Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <UserIcon className="h-5 w-5 mr-2" />
                            Personal Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Full Name</label>
                              <p className="text-gray-900 font-medium">{driver.name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Email</label>
                              <p className="text-gray-900">{driver.email}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Phone</label>
                              <p className="text-gray-900 flex items-center">
                                <PhoneIcon className="h-4 w-4 mr-2" />
                                {driver.phone}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Documents Verified</label>
                              <p className="text-gray-900">
                                {driver.documents_verified ? '✅ Verified' : '❌ Pending'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* License & Vehicle Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <TruckIcon className="h-5 w-5 mr-2" />
                            License & Vehicle Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500">License Number</label>
                              <p className="text-gray-900 font-mono">{driver.license_number}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">License Expiry</label>
                              <p className="text-gray-900">{licenseExpiry.date}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Vehicle Type</label>
                              <p className="text-gray-900">{driver.vehicle_type}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Vehicle Plate</label>
                              <p className="text-gray-900 font-mono">{driver.vehicle_plate}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Emergency Contact */}
                      {driver.emergency_contact && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Emergency Contact</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-500">Name</label>
                                <p className="text-gray-900">{driver.emergency_contact.name}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-500">Phone</label>
                                <p className="text-gray-900">{driver.emergency_contact.phone}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-500">Relationship</label>
                                <p className="text-gray-900">{driver.emergency_contact.relationship}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                      {/* Quick Actions */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Button className="w-full" onClick={() => onContactDriver(driver)}>
                            <PhoneIcon className="h-4 w-4 mr-2" />
                            Call Driver
                          </Button>
                          
                          <Button variant="outline" className="w-full" onClick={() => onViewLocation(driver)}>
                            <MapPinIcon className="h-4 w-4 mr-2" />
                            View Location
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Performance Stats */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <TruckIcon className="h-5 w-5 mr-2" />
                            Performance
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{driver.completed_deliveries}</div>
                            <div className="text-sm text-blue-600">Completed Deliveries</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{driver.rating}/5</div>
                            <div className="text-sm text-green-600">Average Rating</div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Timeline */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <ClockIcon className="h-5 w-5 mr-2" />
                            Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Joined</label>
                            <p className="text-gray-900 text-sm">{joinedDate.date}</p>
                          </div>
                          <Separator />
                          <div>
                            <label className="text-sm font-medium text-gray-500">Last Active</label>
                            <p className="text-gray-900 text-sm">{lastActive.date}</p>
                            <p className="text-gray-500 text-xs">{lastActive.time}</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Current Location */}
                      {driver.current_location && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <MapPinIcon className="h-5 w-5 mr-2" />
                              Location
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="text-sm text-gray-500">Current Location</div>
                              <div className="text-sm text-gray-900">
                                {driver.current_location.address || 'GPS coordinates available'}
                              </div>
                              <div className="text-xs font-mono text-gray-500">
                                {driver.current_location.latitude}, {driver.current_location.longitude}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 px-6 py-4 flex justify-between">
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  
                  {isEditing && (
                    <Button onClick={handleSaveChanges}>
                      Save Changes
                    </Button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}