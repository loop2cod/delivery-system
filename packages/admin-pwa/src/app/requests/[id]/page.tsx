'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DeliveryRequestDetail } from '@/components/requests/DeliveryRequestDetail';
import { AssignDriverModal } from '@/components/requests/AssignDriverModal';
import { adminAPI, DeliveryRequest, Driver } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);

  // Fetch request details
  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDeliveryRequest(requestId);
      setRequest(response.request);
    } catch (error) {
      console.error('Failed to fetch request:', error);
      toast.error('Failed to load request details');
      router.push('/requests');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available drivers for assignment
  const fetchAvailableDrivers = async () => {
    try {
      const data = await adminAPI.getDrivers({
        status: 'ACTIVE',
        availability: 'AVAILABLE',
        limit: 100
      });
      setAvailableDrivers(data.drivers);
    } catch (error) {
      console.error('Failed to fetch available drivers:', error);
      toast.error('Failed to load available drivers');
    }
  };

  useEffect(() => {
    if (requestId) {
      fetchRequest();
    }
  }, [requestId]);

  // Handle status updates
  const handleStatusUpdate = async (status: DeliveryRequest['status'], notes?: string) => {
    if (!request) return;

    try {
      setUpdating(true);
      await adminAPI.updateDeliveryRequestStatus(request.id, {
        status,
        notes
      });
      
      toast.success(`Request status updated to ${status.toLowerCase()}`);
      await fetchRequest(); // Refresh the data
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update request status');
    } finally {
      setUpdating(false);
    }
  };

  // Handle driver assignment
  const handleAssignDriver = async (driverId: string, notes?: string) => {
    if (!request) return;

    try {
      setUpdating(true);
      await adminAPI.assignDriverToRequest(request.id, {
        driverId,
        notes
      });
      
      toast.success('Driver assigned successfully');
      setIsAssignModalOpen(false);
      await fetchRequest(); // Refresh the data
    } catch (error) {
      console.error('Failed to assign driver:', error);
      toast.error('Failed to assign driver');
    } finally {
      setUpdating(false);
    }
  };

  // Handle reject request
  const handleRejectRequest = async (reason: string) => {
    if (!request) return;

    try {
      setUpdating(true);
      await adminAPI.updateDeliveryRequestStatus(request.id, {
        status: 'CANCELLED',
        notes: `Request rejected: ${reason}`
      });
      
      toast.success('Request rejected');
      await fetchRequest(); // Refresh the data
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast.error('Failed to reject request');
    } finally {
      setUpdating(false);
    }
  };

  // Open assign driver modal
  const openAssignDriverModal = () => {
    fetchAvailableDrivers();
    setIsAssignModalOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!request) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Request not found</h2>
          <p className="text-gray-600 mt-2">The requested delivery request could not be found.</p>
          <Button
            onClick={() => router.push('/requests')}
            className="mt-4"
          >
            Back to Requests
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/requests')}
                  className="flex items-center hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back to Requests</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <div className="border-l border-gray-300 pl-4">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Request Details
                  </h1>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-sm text-gray-600">
                    <span className="font-mono">{request.requestNumber}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{request.company?.name || 'Unknown Company'}</span>
                  </div>
                </div>
              </div>
              
              {/* Quick Status Display */}
              <div className="hidden lg:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Current Status</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      request.status === 'DELIVERED' ? 'bg-green-500' :
                      request.status === 'CANCELLED' ? 'bg-red-500' :
                      request.status === 'IN_TRANSIT' ? 'bg-blue-500' :
                      request.status === 'PICKED_UP' ? 'bg-indigo-500' :
                      request.status === 'ASSIGNED' ? 'bg-purple-500' :
                      'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900">
                      {request.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="py-6">
          <DeliveryRequestDetail
            request={request}
            updating={updating}
            onStatusUpdate={handleStatusUpdate}
            onAssignDriver={openAssignDriverModal}
            onRejectRequest={handleRejectRequest}
          />
        </div>

        {/* Assign Driver Modal */}
        <AssignDriverModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          request={request}
          availableDrivers={availableDrivers}
          onAssign={handleAssignDriver}
        />
      </div>
    </AdminLayout>
  );
}