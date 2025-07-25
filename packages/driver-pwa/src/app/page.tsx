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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function DriverDashboard() {
  const { driver, deliveries, activeDelivery, isAuthenticated, updateStatus, refreshDeliveries } = useDriver();
  const { currentLocation, isTracking, startTracking, permission, requestPermission } = useLocation();
  const { isOnline, isInstalled, installPWA, isInstallable } = usePWA();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Auto-start location tracking when driver is available
  useEffect(() => {
    if (driver?.status === 'available' && !isTracking && permission === 'granted') {
      startTracking();
    }
  }, [driver?.status, isTracking, permission, startTracking]);

  // Request location permission on first load
  useEffect(() => {
    if (permission === 'prompt') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Refresh deliveries every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && isAuthenticated) {
        refreshDeliveries();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, isAuthenticated, refreshDeliveries]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (!driver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'status-available';
      case 'busy': return 'status-busy';
      case 'offline': return 'status-offline';
      case 'on_delivery': return 'status-on-delivery';
      default: return 'status-offline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      case 'on_delivery': return 'On Delivery';
      default: return 'Unknown';
    }
  };

  const pendingDeliveries = deliveries.filter(d => d.status === 'assigned');
  const inProgressDeliveries = deliveries.filter(d => ['picked_up', 'in_transit'].includes(d.status));

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
                <p className="text-sm text-primary-100">{driver.vehicle.type} • {driver.vehicle.plateNumber}</p>
              </div>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`status-indicator ${getStatusColor(driver.status)} touch-target`}
              >
                {getStatusText(driver.status)}
              </button>
              
              {showStatusMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border z-10">
                  {(['available', 'busy', 'offline'] as const).map((status) => (
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

        {/* Active Delivery */}
        {activeDelivery && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Active Delivery</h3>
            <DeliveryCard delivery={activeDelivery} isActive={true} />
          </div>
        )}

        {/* Available Deliveries */}
        {pendingDeliveries.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Available Deliveries</h3>
            <div className="space-y-3">
              {pendingDeliveries.map((delivery) => (
                <DeliveryCard key={delivery.id} delivery={delivery} />
              ))}
            </div>
          </div>
        )}

        {/* In Progress Deliveries */}
        {inProgressDeliveries.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">In Progress</h3>
            <div className="space-y-3">
              {inProgressDeliveries.map((delivery) => (
                <DeliveryCard key={delivery.id} delivery={delivery} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {deliveries.length === 0 && (
          <div className="text-center py-12">
            <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries available</h3>
            <p className="text-gray-500">New deliveries will appear here when they're assigned to you.</p>
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

function DeliveryCard({ delivery, isActive = false }: { 
  delivery: any; 
  isActive?: boolean; 
}) {
  const { acceptDelivery, startDelivery, completePickup } = useDriver();
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'text-blue-600 bg-blue-50';
      case 'picked_up': return 'text-yellow-600 bg-yellow-50';
      case 'in_transit': return 'text-purple-600 bg-purple-50';
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`delivery-card ${isActive ? 'active' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">#{delivery.trackingNumber}</h4>
          <p className="text-sm text-gray-500">{delivery.serviceType}</p>
        </div>
        <div className="flex space-x-2">
          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(delivery.priority)}`}>
            {delivery.priority}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(delivery.status)}`}>
            {delivery.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2">
          <MapPinIcon className="h-4 w-4 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Pickup</p>
            <p className="text-xs text-gray-600">{delivery.pickup.address}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <MapPinIcon className="h-4 w-4 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Delivery</p>
            <p className="text-xs text-gray-600">{delivery.delivery.address}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-600">{delivery.estimatedTime}</span>
          </div>
          {delivery.route && (
            <div className="flex items-center space-x-1">
              <NavigationIcon className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-600">{delivery.route.distance}km</span>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          {delivery.status === 'assigned' && (
            <button
              onClick={() => acceptDelivery(delivery.id)}
              className="btn-primary text-xs px-3 py-1"
            >
              Accept
            </button>
          )}
          
          {delivery.status === 'picked_up' && (
            <button
              onClick={() => startDelivery(delivery.id)}
              className="btn-success text-xs px-3 py-1"
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useDriver();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const success = await login(email, password);
    
    if (!success) {
      setError('Invalid email or password');
    }
    
    setIsLoading(false);
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
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
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