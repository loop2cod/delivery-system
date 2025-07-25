'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/providers/BusinessProvider';
import { BusinessLayout } from '@/components/layout/BusinessLayout';
import { RequestTable } from '@/components/requests/RequestTable';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface DeliveryRequest {
  id: string;
  internalReference?: string;
  serviceType: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'draft' | 'submitted' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: string;
  deliveryDate: string;
  estimatedCost: string;
  actualCost?: string;
  itemCount: number;
  createdAt: string;
  createdBy: string;
  assignedDriver?: {
    name: string;
    phone: string;
  };
}

export default function RequestsPage() {
  const { isAuthenticated, isLoading, user } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleViewRequest = (request: DeliveryRequest) => {
    router.push(`/requests/${request.id}`);
  };

  const handleDuplicateRequest = (request: DeliveryRequest) => {
    toast.success(`Duplicating request ${request.id}`);
    // Implement duplication logic - redirect to new request form with pre-filled data
    router.push(`/requests/new?duplicate=${request.id}`);
  };

  const handleTrackRequest = (request: DeliveryRequest) => {
    toast.success(`Opening tracking for ${request.id}`);
    // Implement tracking functionality
    router.push(`/deliveries?track=${request.id}`);
  };

  const handleNewRequest = () => {
    router.push('/requests/new');
  };

  const handleExportRequests = () => {
    toast.success('Exporting request history to CSV');
    // Implement export functionality
  };

  const stats = [
    { name: 'Total Requests', value: '127', change: '+12%', changeType: 'increase' },
    { name: 'This Month', value: '28', change: '+18%', changeType: 'increase' },
    { name: 'In Progress', value: '8', change: '-5%', changeType: 'decrease' },
    { name: 'Success Rate', value: '97.8%', change: '+2%', changeType: 'increase' },
  ];

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Request History
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage all delivery requests for {user?.company?.name}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportRequests}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
            
            <button
              onClick={handleNewRequest}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Request
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.name}
              className="bg-white overflow-hidden shadow-sm rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </div>
                  </div>
                </div>
                <div className="mt-1 flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {item.value}
                  </div>
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Filters */}
        <div className="bg-white shadow-sm rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Quick Filters
            </h3>
            <FunnelIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'All Requests', count: 127, active: true },
              { label: 'Draft', count: 3, active: false },
              { label: 'In Transit', count: 8, active: false },
              { label: 'Delivered', count: 89, active: false },
              { label: 'This Month', count: 28, active: false },
              { label: 'Urgent', count: 5, active: false },
            ].map((filter) => (
              <button
                key={filter.label}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  filter.active
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-medium text-sm">{filter.label}</div>
                <div className="text-xs text-gray-500 mt-1">{filter.count} requests</div>
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <RequestTable
              onViewRequest={handleViewRequest}
              onDuplicateRequest={handleDuplicateRequest}
              onTrackRequest={handleTrackRequest}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {[
                {
                  id: 1,
                  type: 'created',
                  content: 'New request REQ-2024-005 created',
                  target: 'Same-Day Delivery to Marina',
                  date: '1 hour ago',
                  user: 'Sarah Johnson',
                },
                {
                  id: 2,
                  type: 'delivered',
                  content: 'Request REQ-2024-002 delivered successfully',
                  target: 'Document Delivery to Abu Dhabi',
                  date: '3 hours ago',
                  user: 'Ahmed Ali (Driver)',
                },
                {
                  id: 3,
                  type: 'assigned',
                  content: 'Request REQ-2024-004 assigned to driver',
                  target: 'Fragile Items to Exhibition Center',
                  date: '5 hours ago',
                  user: 'System',
                },
                {
                  id: 4,
                  type: 'updated',
                  content: 'Request REQ-2024-001 status updated',
                  target: 'Same-Day Delivery to DIFC',
                  date: '1 day ago',
                  user: 'Omar Hassan (Driver)',
                },
              ].map((activity, activityIdx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {activityIdx !== 3 ? (
                      <span
                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span
                          className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                            activity.type === 'delivered' ? 'bg-green-500' :
                            activity.type === 'assigned' ? 'bg-blue-500' :
                            activity.type === 'created' ? 'bg-primary' : 'bg-gray-500'
                          }`}
                        >
                          <span className="text-white text-xs font-bold">
                            {activity.type === 'delivered' ? '✓' :
                             activity.type === 'assigned' ? '→' :
                             activity.type === 'created' ? '+' : '↑'}
                          </span>
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-500">
                            {activity.content}{' '}
                            <span className="font-medium text-gray-900">
                              {activity.target}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400">by {activity.user}</p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          <time>{activity.date}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}