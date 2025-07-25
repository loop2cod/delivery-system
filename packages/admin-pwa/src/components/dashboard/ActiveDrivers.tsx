'use client';

import { useState } from 'react';
import { 
  TruckIcon,
  MapPinIcon,
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  licensePlate: string;
  status: 'available' | 'on_delivery' | 'break' | 'offline';
  currentLocation: string;
  completedToday: number;
  rating: number;
  avatar?: string;
  currentDelivery?: {
    id: string;
    customer: string;
    destination: string;
    estimatedTime: string;
  };
}

const drivers: Driver[] = [
  {
    id: 'DRV-001',
    name: 'Omar Hassan',
    phone: '+971-50-123-4567',
    vehicle: 'Honda Civic',
    licensePlate: 'DXB-A-12345',
    status: 'on_delivery',
    currentLocation: 'Business Bay',
    completedToday: 8,
    rating: 4.9,
    currentDelivery: {
      id: 'PKG-2024-001',
      customer: 'Sarah Johnson',
      destination: 'DIFC',
      estimatedTime: '15 min',
    },
  },
  {
    id: 'DRV-002',
    name: 'Ahmed Ali',
    phone: '+971-56-789-0123',
    vehicle: 'Toyota Corolla',
    licensePlate: 'DXB-B-67890',
    status: 'available',
    currentLocation: 'Dubai Mall',
    completedToday: 12,
    rating: 4.8,
  },
  {
    id: 'DRV-003',
    name: 'Mohammed Al Rashid',
    phone: '+971-52-456-7890',
    vehicle: 'Nissan Altima',
    licensePlate: 'DXB-C-54321',
    status: 'on_delivery',
    currentLocation: 'Marina Mall',
    completedToday: 6,
    rating: 4.7,
    currentDelivery: {
      id: 'PKG-2024-002',
      customer: 'Fatima Hassan',
      destination: 'Jumeirah',
      estimatedTime: '25 min',
    },
  },
  {
    id: 'DRV-004',
    name: 'Khalid Ibrahim',
    phone: '+971-50-987-6543',
    vehicle: 'Hyundai Elantra',
    licensePlate: 'DXB-D-98765',
    status: 'break',
    currentLocation: 'Al Barsha',
    completedToday: 10,
    rating: 4.6,
  },
  {
    id: 'DRV-005',
    name: 'Ali Mohammed',
    phone: '+971-55-234-5678',
    vehicle: 'KIA Cerato',
    licensePlate: 'DXB-E-13579',
    status: 'available',
    currentLocation: 'Deira City Centre',
    completedToday: 9,
    rating: 4.8,
  },
];

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

export function ActiveDrivers() {
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const handleDriverAction = (driverId: string, action: string) => {
    console.log(`${action} driver ${driverId}`);
    // Implement driver action logic here
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'on_delivery':
        return 'On Delivery';
      case 'break':
        return 'On Break';
      case 'offline':
        return 'Offline';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Active Drivers
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Available: {drivers.filter(d => d.status === 'available').length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">On Delivery: {drivers.filter(d => d.status === 'on_delivery').length}</span>
            </div>
            <button className="text-primary hover:text-primary/80 font-medium">
              View all drivers
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {drivers.map((driver) => {
            const StatusIcon = statusIcons[driver.status];
            return (
              <div
                key={driver.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {driver.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {driver.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {driver.vehicle} • {driver.licensePlate}
                      </p>
                      <div className="flex items-center mt-1">
                        <PhoneIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500">{driver.phone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <span className={clsx(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    statusColors[driver.status]
                  )}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {getStatusText(driver.status)}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-500">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      <span>Current Location</span>
                    </div>
                    <span className="text-gray-900 font-medium">
                      {driver.currentLocation}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Completed Today</span>
                    <span className="text-gray-900 font-medium">
                      {driver.completedToday} deliveries
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Rating</span>
                    <div className="flex items-center">
                      <span className="text-gray-900 font-medium mr-1">
                        {driver.rating}
                      </span>
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={clsx(
                              'h-4 w-4',
                              i < Math.floor(driver.rating) ? 'fill-current' : 'text-gray-300'
                            )}
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>

                  {driver.currentDelivery && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        Current Delivery
                      </p>
                      <p className="text-sm text-blue-800">
                        {driver.currentDelivery.customer} → {driver.currentDelivery.destination}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        ETA: {driver.currentDelivery.estimatedTime}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => handleDriverAction(driver.id, 'call')}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    Call
                  </button>
                  
                  <button
                    onClick={() => handleDriverAction(driver.id, 'assign')}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Assign Delivery
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}