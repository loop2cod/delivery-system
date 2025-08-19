'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useBusiness } from '@/providers/BusinessProvider';
import { BusinessLayout } from '@/components/layout/BusinessLayout';
import { businessAPI } from '@/lib/api';
import { toast } from '@/lib/toast';
import {
  ArrowLeftIcon,
  ClockIcon,
  MapPinIcon,
  TruckIcon,
  DocumentDuplicateIcon,
  PhoneIcon,
  ScaleIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface DeliveryRequest {
  id: string;
  requestNumber: string;
  internalReference?: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  pickupContactName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupInstructions?: string;
  deliveryContactName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryInstructions?: string;
  pickupDate: string;
  pickupTime: string;
  deliveryDate: string;
  deliveryTime: string;
  items: Array<{
    description: string;
    quantity: number;
    weight?: number;
    dimensions?: string;
    value?: number;
    fragile: boolean;
    paymentType?: 'paid' | 'cod';
    codAmount?: number;
  }>;
  totalWeight: number;
  estimatedCost: number;
  actualCost?: number;
  specialRequirements?: string;
  createdAt: string;
  updatedAt: string;
  assignedDriver?: {
    name: string;
    phone: string;
  };
}

const statusColors = {
  PENDING: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  PICKED_UP: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const statusIcons = {
  PENDING: ClockIcon,
  ASSIGNED: TruckIcon,
  PICKED_UP: CheckCircleIcon,
  IN_TRANSIT: TruckIcon,
  DELIVERED: CheckCircleIcon,
  CANCELLED: ExclamationTriangleIcon,
};

export default function RequestDetailPage() {
  const { isAuthenticated, isLoading, user } = useBusiness();
  const router = useRouter();
  const params = useParams();
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestId = params.id as string;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && requestId) {
      loadRequestDetails();
    }
  }, [isAuthenticated, requestId]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await businessAPI.getRequest(requestId);
      setRequest(response.request);
    } catch (error: any) {
      console.error('Failed to load request details:', error);
      setError(error.response?.data?.error || 'Failed to load request details');
      toast.error('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = () => {
    toast.success(`Duplicating request ${request?.requestNumber}`);
    router.push(`/requests/new?duplicate=${request?.id}`);
  };

  const handleTrack = () => {
    if (request && ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(request.status)) {
      toast.success(`Opening tracking for ${request.requestNumber}`);
      router.push(`/deliveries?track=${request.id}`);
    } else {
      toast.info('Tracking not available for this request status');
    }
  };

  if (isLoading || loading) {
    return (
      <BusinessLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </BusinessLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error || !request) {
    return (
      <BusinessLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Request not found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {error || 'The request you are looking for does not exist or you do not have permission to view it.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/requests')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Requests
              </button>
            </div>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  const StatusIcon = statusIcons[request.status];

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/requests')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Request Details
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {request.requestNumber}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDuplicate}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
              Duplicate
            </button>
            {['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(request.status) && (
              <button
                onClick={handleTrack}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                <TruckIcon className="h-4 w-4 mr-2" />
                Track
              </button>
            )}
          </div>
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center">
              <StatusIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={clsx(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-1',
                  statusColors[request.status]
                )}>
                  {request.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Priority</p>
                <span className={clsx(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-1',
                  priorityColors[request.priority]
                )}>
                  {request.priority}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(request.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup and Delivery Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pickup Details */}
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Pickup Details</h3>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Contact Person</p>
                <p className="font-medium text-gray-900">{request.pickupContactName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <div className="flex items-center">
                  <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <a href={`tel:${request.pickupPhone}`} className="text-primary hover:text-primary/80">
                    {request.pickupPhone}
                  </a>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="text-gray-900">{request.pickupAddress}</p>
              </div>
              {request.pickupInstructions && (
                <div>
                  <p className="text-sm text-gray-500">Instructions</p>
                  <p className="text-gray-900">{request.pickupInstructions}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Scheduled Time</p>
                <p className="font-medium text-gray-900">
                  {new Date(request.pickupDate).toLocaleDateString()} at {request.pickupTime}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Delivery Details</h3>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Contact Person</p>
                <p className="font-medium text-gray-900">{request.deliveryContactName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <div className="flex items-center">
                  <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <a href={`tel:${request.deliveryPhone}`} className="text-primary hover:text-primary/80">
                    {request.deliveryPhone}
                  </a>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="text-gray-900">{request.deliveryAddress}</p>
              </div>
              {request.deliveryInstructions && (
                <div>
                  <p className="text-sm text-gray-500">Instructions</p>
                  <p className="text-gray-900">{request.deliveryInstructions}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Scheduled Time</p>
                <p className="font-medium text-gray-900">
                  {new Date(request.deliveryDate).toLocaleDateString()} at {request.deliveryTime}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Items</h3>
          </div>
          <div className="px-6 py-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Special
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {request.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.description}
                        {item.dimensions && (
                          <div className="text-xs text-gray-500">{item.dimensions}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.weight ? `${item.weight} kg` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.value ? `AED ${item.value}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.paymentType === 'cod' ? (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              COD
                            </span>
                            <div className="text-xs text-gray-600 mt-1">
                              AED {item.codAmount?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Paid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.fragile && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Fragile
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ScaleIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    Total Weight: <span className="font-medium">{request.totalWeight} kg</span>
                  </span>
                </div>
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">
                    Delivery Cost: <span className="font-medium">
                      AED {request.actualCost || request.estimatedCost}
                      {request.actualCost && request.actualCost !== request.estimatedCost && (
                        <span className="text-xs text-gray-500 ml-1">
                          (Est: AED {request.estimatedCost})
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              </div>
              
              {/* COD Summary */}
              {(() => {
                const codItems = request.items.filter(item => item.paymentType === 'cod');
                const totalCOD = codItems.reduce((sum, item) => sum + (item.codAmount || 0), 0);
                
                if (codItems.length > 0) {
                  return (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-orange-900">Cash on Delivery (COD)</h4>
                          <p className="text-sm text-orange-700">
                            {codItems.length} item{codItems.length !== 1 ? 's' : ''} require{codItems.length === 1 ? 's' : ''} cash collection
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-orange-600">
                            AED {totalCOD.toFixed(2)}
                          </p>
                          <p className="text-xs text-orange-600">
                            To be collected from recipient
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Special Requirements */}
          {request.specialRequirements && (
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Special Requirements</h3>
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-900">{request.specialRequirements}</p>
              </div>
            </div>
          )}

          {/* Driver Information */}
          {request.assignedDriver && (
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <TruckIcon className="h-5 w-5 text-green-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Assigned Driver</h3>
                </div>
              </div>
              <div className="px-6 py-4 space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{request.assignedDriver.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <div className="flex items-center">
                    <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <a href={`tel:${request.assignedDriver.phone}`} className="text-primary hover:text-primary/80">
                      {request.assignedDriver.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reference Information */}
          {request.internalReference && (
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Reference Information</h3>
              </div>
              <div className="px-6 py-4">
                <div>
                  <p className="text-sm text-gray-500">Internal Reference</p>
                  <p className="font-medium text-gray-900">{request.internalReference}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </BusinessLayout>
  );
}