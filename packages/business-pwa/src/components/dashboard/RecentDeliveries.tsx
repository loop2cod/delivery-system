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

interface DeliveryRequest {
  id?: string;
  _id?: string;
  requestNumber?: string;
  deliveryContactName: string;
  deliveryAddress: string;
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  priority: 'normal' | 'high' | 'urgent';
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  pickupContactName?: string;
  pickupAddress?: string;
  items?: Array<{
    description: string;
    quantity: number;
    weight?: number;
  }>;
}

interface RecentDeliveriesProps {
  requests?: DeliveryRequest[];
  loading?: boolean;
}


const statusConfig = {
  PENDING: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: ClockIcon,
    label: 'Pending Pickup',
  },
  ASSIGNED: {
    color: 'bg-blue-100 text-blue-800',
    icon: TruckIcon,
    label: 'Assigned',
  },
  PICKED_UP: {
    color: 'bg-blue-100 text-blue-800',
    icon: TruckIcon,
    label: 'Picked Up',
  },
  IN_TRANSIT: {
    color: 'bg-indigo-100 text-indigo-800',
    icon: TruckIcon,
    label: 'In Transit',
  },
  DELIVERED: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleIcon,
    label: 'Delivered',
  },
  CANCELLED: {
    color: 'bg-red-100 text-red-800',
    icon: ExclamationTriangleIcon,
    label: 'Cancelled',
  },
};

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export function RecentDeliveries({ requests = [], loading = false }: RecentDeliveriesProps) {
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

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-6">
          Recent Delivery Requests
        </h3>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <h3 className="text-base sm:text-lg font-medium leading-6 text-gray-900">
            Recent Delivery Requests
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Delivered: {requests.filter(d => d.status === 'DELIVERED').length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Active: {requests.filter(d => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)).length}</span>
            </div>
            <button className="text-primary hover:text-primary/80 font-medium text-left sm:text-center">
              View all requests
            </button>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recent requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your recent delivery requests will appear here.
            </p>
          </div>
        ) : (
          <div className="flow-root">
            <ul role="list" className="-mb-8">
              {requests.slice(0, 5).map((request, index) => {
                const statusInfo = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.PENDING;
                const StatusIcon = statusInfo.icon;
                const requestId = request.id || request._id || 'unknown';
                
                return (
                  <li key={requestId}>
                    <div className="relative pb-6 sm:pb-8">
                      {index !== Math.min(requests.length, 5) - 1 && (
                        <span
                          className="absolute left-4 sm:left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className={clsx(
                            'h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center',
                            request.status === 'DELIVERED' ? 'bg-green-500' :
                            request.status === 'CANCELLED' ? 'bg-red-500' :
                            request.status === 'IN_TRANSIT' ? 'bg-blue-500' :
                            request.status === 'PICKED_UP' ? 'bg-indigo-500' : 'bg-yellow-500'
                          )}>
                            <StatusIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {request.deliveryContactName}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-500 font-mono">
                                {request.requestNumber || requestId}
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                              {request.priority && (
                                <span className={clsx(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                  priorityColors[request.priority]
                                )}>
                                  {request.priority}
                                </span>
                              )}
                              <span className={clsx(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                statusInfo.color
                              )}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-2 text-xs sm:text-sm text-gray-700">
                            <div className="flex items-start space-x-2 mb-1">
                              <MapPinIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="truncate sm:text-clip">{request.deliveryAddress}</span>
                            </div>
                            {request.items && request.items.length > 0 && (
                              <p className="text-gray-600 text-xs">
                                {request.items[0].description}
                                {request.items.length > 1 && ` (+${request.items.length - 1} more)`}
                              </p>
                            )}
                          </div>
                          
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs text-gray-500">
                            <div>
                              <span className="font-medium">Cost:</span> AED {request.actualCost || request.estimatedCost || 'TBD'}
                            </div>
                            <div>
                              <span className="font-medium">Created:</span> {formatTime(request.createdAt)}
                            </div>
                          </div>
                          
                          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewDelivery(requestId)}
                                className="inline-flex items-center px-2 sm:px-2.5 py-1 sm:py-1.5 border border-transparent text-xs font-medium rounded text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                <EyeIcon className="h-3 w-3 mr-1" />
                                View Details
                              </button>
                              
                              {request.status !== 'DELIVERED' && request.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => handleTrackDelivery(requestId)}
                                  className="inline-flex items-center px-2 sm:px-2.5 py-1 sm:py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
        )}
      </div>
    </div>
  );
}