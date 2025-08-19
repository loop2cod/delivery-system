'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserIcon, 
  XMarkIcon, 
  TruckIcon,
  StarIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useDriver } from '@/providers/DriverProvider';
import { useLocation } from '@/providers/LocationProvider';
import { usePWA } from '@/providers/PWAProvider';

export default function ProfilePage() {
  const router = useRouter();
  const { driver, logout, updateStatus } = useDriver();
  const { currentLocation, isTracking, startTracking, stopTracking, permission } = useLocation();
  const { isOnline, isInstalled, installPWA, isInstallable } = usePWA();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!driver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'BUSY': return 'bg-yellow-100 text-yellow-800';
      case 'OFFLINE': return 'bg-gray-100 text-gray-800';
      case 'ON_BREAK': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Available';
      case 'BUSY': return 'Busy';
      case 'OFFLINE': return 'Offline';
      case 'ON_BREAK': return 'On Break';
      default: return 'Unknown';
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-1 hover:bg-primary-600 rounded"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Profile</h1>
                <p className="text-xs text-primary-100">Driver information & settings</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 hover:bg-primary-600 rounded"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-20">
        {/* Profile Header */}
        <div className="bg-white rounded-lg p-6 mb-4 shadow-sm">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{driver.name.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{driver.name}</h2>
              <p className="text-gray-600">{driver.vehicle_type} Driver</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(driver.status)}`}>
                  {getStatusText(driver.status)}
                </span>
                <div className="flex items-center space-x-1">
                  <StarIcon className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">{driver.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-lg font-bold text-green-600">{driver.total_deliveries}</span>
              </div>
              <p className="text-xs text-gray-500">Deliveries</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <StarIcon className="h-5 w-5 text-yellow-500" />
                <span className="text-lg font-bold text-yellow-600">{driver.rating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1">
                <ClockIcon className="h-5 w-5 text-blue-500" />
                <span className="text-lg font-bold text-blue-600">
                  {driver.status === 'AVAILABLE' ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Status</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h3 className="font-medium mb-3">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{driver.email}</p>
                <p className="text-xs text-gray-500">Email</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <PhoneIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{driver.phone}</p>
                <p className="text-xs text-gray-500">Phone</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h3 className="font-medium mb-3">Vehicle Information</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <TruckIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{driver.vehicle_type}</p>
                <p className="text-xs text-gray-500">Vehicle Type</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <IdentificationIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{driver.vehicle_plate}</p>
                <p className="text-xs text-gray-500">License Plate</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <IdentificationIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{driver.license_number}</p>
                <p className="text-xs text-gray-500">Driver License</p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Status */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h3 className="font-medium mb-3">Location Services</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPinIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">GPS Tracking</p>
                  <p className="text-xs text-gray-500">
                    {permission === 'granted' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              
              {permission === 'granted' && (
                <button
                  onClick={isTracking ? stopTracking : startTracking}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    isTracking 
                      ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {isTracking ? 'Stop' : 'Start'}
                </button>
              )}
            </div>
            
            {currentLocation && (
              <div className="pl-8">
                <p className="text-xs text-gray-600">
                  Current: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* App Settings */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h3 className="font-medium mb-3">App Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CogIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Connection Status</p>
                  <p className="text-xs text-gray-500">
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            
            {!isInstalled && isInstallable && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CogIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Install App</p>
                    <p className="text-xs text-gray-500">Add to home screen</p>
                  </div>
                </div>
                <button
                  onClick={installPWA}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium hover:bg-blue-200"
                >
                  Install
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Controls */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h3 className="font-medium mb-3">Change Status</h3>
          <div className="grid grid-cols-2 gap-3">
            {(['AVAILABLE', 'BUSY', 'OFFLINE', 'ON_BREAK'] as const).map((status) => (
              <button
                key={status}
                onClick={() => updateStatus(status)}
                className={`p-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  driver.status === status
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                }`}
              >
                {getStatusText(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-medium mb-3">Account</h3>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Sign Out</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to sign out? You'll need to log in again to access your deliveries.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}