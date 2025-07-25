'use client';

import { useState } from 'react';
import { 
  EyeIcon, 
  MapPinIcon, 
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface Delivery {
  id: string;
  packageId: string;
  recipient: string;
  address: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'delayed';
  priority: 'normal' | 'high' | 'urgent';
  estimatedDelivery: string;
  driver?: {
    name: string;
    phone: string;
  };
  cost: string;
  createdAt: string;
  description: string;
}

const deliveries: Delivery[] = [
  {
    id: 'DEL-2024-001',
    packageId: 'PKG-2024-001',
    recipient: 'Sarah Johnson',
    address: 'Business Bay Tower, Downtown Dubai',
    status: 'in_transit',
    priority: 'urgent',
    estimatedDelivery: '2024-01-15T16:30:00Z',
    driver: {
      name: 'Omar Hassan',
      phone: '+971-50-123-4567',
    },
    cost: 'AED 45',
    createdAt: '2024-01-15T10:30:00Z',
    description: 'Contract documents for client meeting',
  },
  {
    id: 'DEL-2024-002',
    packageId: 'PKG-2024-002',
    recipient: 'Ahmed Al Rashid',
    address: 'DIFC Gate Avenue, DIFC',
    status: 'picked_up',
    priority: 'high',
    estimatedDelivery: '2024-01-15T18:00:00Z',
    driver: {
      name: 'Mohammed Ali',
      phone: '+971-56-789-0123',
    },
    cost: 'AED 65',
    createdAt: '2024-01-15T12:15:00Z',
    description: 'Marketing materials for presentation',
  },
  {
    id: 'DEL-2024-003',
    packageId: 'PKG-2024-003',
    recipient: 'Fatima Hassan',
    address: 'Marina Mall, Dubai Marina',
    status: 'delivered',
    priority: 'normal',
    estimatedDelivery: '2024-01-15T14:00:00Z',
    cost: 'AED 35',
    createdAt: '2024-01-15T09:45:00Z',
    description: 'Product samples for client review',
  },
  {
    id: 'DEL-2024-004',
    packageId: 'PKG-2024-004',
    recipient: 'Khalid Ibrahim',
    address: 'Al Barsha Mall, Al Barsha',
    status: 'delayed',
    priority: 'high',
    estimatedDelivery: '2024-01-15T17:30:00Z',
    driver: {
      name: 'Ali Mohammed',
      phone: '+971-52-456-7890',
    },
    cost: 'AED 55',
    createdAt: '2024-01-15T11:20:00Z',
    description: 'Hardware components for installation',
  },
  {
    id: 'DEL-2024-005',
    packageId: 'PKG-2024-005',
    recipient: 'Laila Abdullah',
    address: 'Sharjah City Centre, Sharjah',
    status: 'pending',
    priority: 'normal',
    estimatedDelivery: '2024-01-16T10:00:00Z',
    cost: 'AED 75',
    createdAt: '2024-01-15T14:30:00Z',
    description: 'Training materials for workshop',
  },
];

const statusConfig = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: ClockIcon,
    label: 'Pending Pickup',
  },
  picked_up: {
    color: 'bg-blue-100 text-blue-800',
    icon: TruckIcon,
    label: 'Picked Up',
  },
  in_transit: {
    color: 'bg-indigo-100 text-indigo-800',
    icon: TruckIcon,
    label: 'In Transit',
  },
  delivered: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleIcon,
    label: 'Delivered',
  },
  delayed: {
    color: 'bg-red-100 text-red-800',
    icon: ExclamationTriangleIcon,
    label: 'Delayed',
  },
};

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export function RecentDeliveries() {
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);

  const handleViewDelivery = (deliveryId: string) => {
    console.log('View delivery:', deliveryId);
    // Implement view delivery functionality
  };

  const handleTrackDelivery = (deliveryId: string) => {
    console.log('Track delivery:', deliveryId);
    // Implement tracking functionality
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getEstimatedDelivery = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date < now) {
      return 'Overdue';
    }
    
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} min`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours`;
    } else {
      return `${Math.floor(diffInHours / 24)} days`;
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Recent Deliveries
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Delivered: {deliveries.filter(d => d.status === 'delivered').length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">In Transit: {deliveries.filter(d => d.status === 'in_transit').length}</span>
            </div>
            <button className="text-primary hover:text-primary/80 font-medium">
              View all deliveries
            </button>
          </div>
        </div>

        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {deliveries.map((delivery, index) => {
              const statusInfo = statusConfig[delivery.status];
              const StatusIcon = statusInfo.icon;
              
              return (
                <li key={delivery.id}>
                  <div className="relative pb-8">
                    {index !== deliveries.length - 1 && (
                      <span
                        className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className={clsx(
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          delivery.status === 'delivered' ? 'bg-green-500' :
                          delivery.status === 'delayed' ? 'bg-red-500' :
                          delivery.status === 'in_transit' ? 'bg-blue-500' :
                          delivery.status === 'picked_up' ? 'bg-indigo-500' : 'bg-yellow-500'
                        )}>
                          <StatusIcon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {delivery.recipient}
                            </p>
                            <p className="text-sm text-gray-500 font-mono">
                              {delivery.packageId}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={clsx(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                              priorityColors[delivery.priority]
                            )}>
                              {delivery.priority}
                            </span>
                            <span className={clsx(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                              statusInfo.color
                            )}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-700">
                          <div className="flex items-start space-x-2 mb-1">
                            <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>{delivery.address}</span>
                          </div>
                          <p className="text-gray-600">{delivery.description}</p>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-500">
                          <div>
                            <span className="font-medium">Cost:</span> {delivery.cost}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {formatTime(delivery.createdAt)}
                          </div>
                          <div>
                            <span className={clsx(
                              'font-medium',
                              delivery.status === 'delivered' ? 'text-green-600' :
                              delivery.status === 'delayed' ? 'text-red-600' : 'text-gray-500'
                            )}>
                              {delivery.status === 'delivered' ? 'Delivered' : 
                               delivery.status === 'delayed' ? 'Delayed' : 'ETA:'} 
                            </span>{' '}
                            {delivery.status !== 'delivered' && getEstimatedDelivery(delivery.estimatedDelivery)}
                          </div>
                        </div>

                        {delivery.driver && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-900">
                              Driver: {delivery.driver.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {delivery.driver.phone}
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewDelivery(delivery.id)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                              <EyeIcon className="h-3 w-3 mr-1" />
                              View Details
                            </button>
                            
                            {delivery.status !== 'delivered' && (
                              <button
                                onClick={() => handleTrackDelivery(delivery.id)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                <MapPinIcon className="h-3 w-3 mr-1" />
                                Track
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}