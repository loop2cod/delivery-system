'use client';

import { useEffect, useState } from 'react';
import { useDriver } from '@/providers/DriverProvider';
import { useLocation } from '@/providers/LocationProvider';
import { usePWA } from '@/providers/PWAProvider';
import { 
  TruckIcon, 
  MapPinIcon, 
  ClockIcon, 
  BellIcon,
  QrCodeIcon,
  NavigationIcon,
  SignalIcon,
  SignalSlashIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

export default function DriverDashboard() {
  const { driver, assignments, isAuthenticated, isLoading, updateStatus, refreshAssignments } = useDriver();
  const { currentLocation, isTracking, startTracking, permission, requestPermission } = useLocation();
  const { isOnline, isInstalled, installPWA, isInstallable } = usePWA();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Auto-start location tracking when driver is available
  useEffect(() => {
    if (driver?.status === 'AVAILABLE' && !isTracking && permission === 'granted') {
      startTracking();
    }
  }, [driver?.status, isTracking, permission, startTracking]);

  // Request location permission on first load
  useEffect(() => {
    if (permission === 'prompt') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Refresh assignments every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && isAuthenticated) {
        refreshAssignments();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, isAuthenticated, refreshAssignments]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <TruckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Driver Profile Not Found</h3>
          <p className="text-gray-500">Please contact support to set up your driver profile.</p>
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

  const assignedDeliveries = assignments.filter(a => a.status === 'ASSIGNED');
  const inProgressDeliveries = assignments.filter(a => a.status === 'IN_PROGRESS');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TruckIcon className="h-8 w-8" />
              <div>
                <h1 className="text-lg font-semibold">UAE Delivery</h1>
                <p className="text-xs text-primary-100">Driver Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isOnline && <SignalSlashIcon className="h-5 w-5 text-red-300" />}
              {isOnline && <SignalIcon className="h-5 w-5 text-green-300" />}
              
              {!isInstalled && isInstallable && (
                <button
                  onClick={installPWA}
                  className="text-xs bg-accent px-2 py-1 rounded"
                >
                  Install
                </button>
              )}
            </div>
          </div>

          {/* Driver Info */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold">{driver.name.charAt(0)}</span>
              </div>
              <div>
                <h2 className="font-medium">{driver.name}</h2>
                <p className="text-sm text-primary-100">{driver.vehicle_type} • {driver.vehicle_plate}</p>
              </div>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(driver.status)}`}
              >
                {getStatusText(driver.status)}
              </button>
              
              {showStatusMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border z-10">
                  {(['AVAILABLE', 'BUSY', 'OFFLINE', 'ON_BREAK'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        updateStatus(status);
                        setShowStatusMenu(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {getStatusText(status)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-20">
        {/* Location Status */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPinIcon className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium">Location</span>
            </div>
            {isTracking && (
              <div className="location-marker location-pulse"></div>
            )}
          </div>
          
          {currentLocation ? (
            <p className="text-xs text-gray-600 mt-1">
              Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
            </p>
          ) : (
            <p className="text-xs text-red-600 mt-1">Location not available</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{driver.totalDeliveries}</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Rating</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">{driver.rating.toFixed(1)}</p>
          </div>
        </div>

        {/* In Progress Deliveries */}
        {inProgressDeliveries.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">In Progress</h3>
            <div className="space-y-3">
              {inProgressDeliveries.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          </div>
        )}

        {/* Available Assignments */}
        {assignedDeliveries.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">New Assignments</h3>
            <div className="space-y-3">
              {assignedDeliveries.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {assignments.length === 0 && (
          <div className="text-center py-12">
            <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments available</h3>
            <p className="text-gray-500">New delivery assignments will appear here when they're assigned to you.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-4 py-2">
          <button className="flex flex-col items-center py-2 px-1 text-primary">
            <TruckIcon className="h-6 w-6" />
            <span className="text-xs mt-1">Dashboard</span>
          </button>
          
          <button className="flex flex-col items-center py-2 px-1 text-gray-500">
            <QrCodeIcon className="h-6 w-6" />
            <span className="text-xs mt-1">Scan</span>
          </button>
          
          <button className="flex flex-col items-center py-2 px-1 text-gray-500">
            <NavigationIcon className="h-6 w-6" />
            <span className="text-xs mt-1">Navigate</span>
          </button>
          
          <button className="flex flex-col items-center py-2 px-1 text-gray-500">
            <CameraIcon className="h-6 w-6" />
            <span className="text-xs mt-1">Camera</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: any }) {
  const { acceptAssignment, completeAssignment } = useDriver();
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'text-blue-600 bg-blue-50';
      case 'IN_PROGRESS': return 'text-yellow-600 bg-yellow-50';
      case 'COMPLETED': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-gray-900">#{assignment.tracking_number}</h4>
            <p className="text-sm text-gray-500">{assignment.package_details?.description || 'Package delivery'}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(assignment.status)}`}>
            {assignment.status.replace('_', ' ')}
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Pickup</p>
              <p className="text-sm text-gray-600">{assignment.pickup_location.address}</p>
              {assignment.pickup_location.contact_name && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">{assignment.pickup_location.contact_name}</span>
                  {assignment.pickup_location.contact_phone && (
                    <a 
                      href={`tel:${assignment.pickup_location.contact_phone}`}
                      className="text-xs text-blue-600 flex items-center space-x-1"
                    >
                      <PhoneIcon className="h-3 w-3" />
                      <span>Call</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3 ml-6">
            <ArrowRightIcon className="h-4 w-4 text-gray-400" />
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Delivery</p>
              <p className="text-sm text-gray-600">{assignment.delivery_location.address}</p>
              {assignment.delivery_location.contact_name && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">{assignment.delivery_location.contact_name}</span>
                  {assignment.delivery_location.contact_phone && (
                    <a 
                      href={`tel:${assignment.delivery_location.contact_phone}`}
                      className="text-xs text-blue-600 flex items-center space-x-1"
                    >
                      <PhoneIcon className="h-3 w-3" />
                      <span>Call</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {assignment.special_instructions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Special Instructions:</strong> {assignment.special_instructions}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {assignment.estimated_delivery && (
              <div className="flex items-center space-x-1">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-600">
                  ETA: {formatDate(assignment.estimated_delivery)}
                </span>
              </div>
            )}
            {assignment.estimated_cost && (
              <div className="text-xs text-gray-600">
                AED {assignment.estimated_cost.toFixed(2)}
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            {assignment.status === 'ASSIGNED' && (
              <button
                onClick={() => acceptAssignment(assignment.id)}
                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                Accept
              </button>
            )}
            
            {assignment.status === 'IN_PROGRESS' && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700"
              >
                Complete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Complete Delivery Modal */}
      {showCompleteModal && (
        <CompleteDeliveryModal
          assignment={assignment}
          onComplete={(notes) => {
            completeAssignment(assignment.id, notes);
            setShowCompleteModal(false);
          }}
          onCancel={() => setShowCompleteModal(false)}
        />
      )}
    </>
  );
}

function CompleteDeliveryModal({ 
  assignment, 
  onComplete, 
  onCancel 
}: { 
  assignment: any;
  onComplete: (notes: string) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Complete Delivery</h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Delivery: #{assignment.tracking_number}
          </p>
          <p className="text-sm text-gray-600">
            To: {assignment.delivery_location.address}
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Any additional notes about the delivery..."
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onComplete(notes)}
            className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useDriver();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = await login(email, password);
    
    if (!success) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <div className="text-center mb-6">
          <TruckIcon className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Driver Login</h1>
          <p className="text-gray-600">Sign in to start delivering</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}