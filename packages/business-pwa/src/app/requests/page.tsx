'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/providers/BusinessProvider';
import { BusinessLayout } from '@/components/layout/BusinessLayout';
import { RequestTable } from '@/components/requests/RequestTable';
import { businessAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface DeliveryRequest {
  id: string;
  requestNumber: string;
  internalReference?: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: string;
  deliveryDate: string;
  estimatedCost: number;
  actualCost?: number;
  totalWeight: number;
  items: any[];
  createdAt: string;
  assignedDriver?: {
    name: string;
    phone: string;
  };
}

interface RequestStats {
  total: number;
  pending: number;
  inProgress: number;
  delivered: number;
  cancelled: number;
}

export default function RequestsPage() {
  const { isAuthenticated, isLoading, user } = useBusiness();
  const router = useRouter();
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Load real stats from API
  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      
      // Get all requests by fetching multiple pages (max 100 per page)
      let allRequests: DeliveryRequest[] = [];
      let currentPage = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await businessAPI.getRequests({ 
          page: currentPage, 
          limit: 100 
        });
        
        allRequests = [...allRequests, ...response.requests];
        
        // Check if we have more pages
        hasMore = currentPage < response.pagination.pages;
        currentPage++;
        
        // Safety break to avoid infinite loops
        if (currentPage > 50) break;
      }
      
      const statsData: RequestStats = {
        total: allRequests.length,
        pending: allRequests.filter(r => r.status === 'PENDING').length,
        inProgress: allRequests.filter(r => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(r.status)).length,
        delivered: allRequests.filter(r => r.status === 'DELIVERED').length,
        cancelled: allRequests.filter(r => r.status === 'CANCELLED').length,
      };
      
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

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
    toast.success(`Duplicating request ${request.requestNumber}`);
    router.push(`/requests/new?duplicate=${request.id}`);
  };

  const handleTrackRequest = (request: DeliveryRequest) => {
    toast.success(`Opening tracking for ${request.requestNumber}`);
    router.push(`/deliveries?track=${request.id}`);
  };

  const handleNewRequest = () => {
    router.push('/requests/new');
  };

  const handleExportRequests = async () => {
    try {
      toast.loading('Preparing export...');
      
      // Get all requests by fetching multiple pages (max 100 per page)
      let allRequests: DeliveryRequest[] = [];
      let currentPage = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await businessAPI.getRequests({ 
          page: currentPage, 
          limit: 100 
        });
        
        // Filter out DELIVERED requests from stats
        const nonDeliveredRequests = response.requests.filter(
          (request: any) => request.status !== 'DELIVERED'
        );
        allRequests = [...allRequests, ...nonDeliveredRequests];
        hasMore = currentPage < response.pagination.pages;
        currentPage++;
        
        if (currentPage > 50) break; // Safety break
      }
      
      toast.dismiss();
      
      if (allRequests.length === 0) {
        toast.error('No requests to export');
        return;
      }
      
      const csvData = allRequests.map(req => ({
        'Request Number': req.requestNumber,
        'Status': req.status,
        'Priority': req.priority,
        'Pickup Address': req.pickupAddress,
        'Delivery Address': req.deliveryAddress,
        'Total Weight': req.totalWeight,
        'Cost': `AED ${req.estimatedCost}`,
        'Created': new Date(req.createdAt).toLocaleDateString(),
      }));
      
      // Simple CSV export with proper escaping
      const csv = [Object.keys(csvData[0]).join(','), ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery-requests-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${allRequests.length} requests successfully`);
    } catch (error) {
      toast.dismiss();
      console.error('Export error:', error);
      toast.error('Failed to export requests');
    }
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Requests
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* <button
              onClick={handleExportRequests}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button> */}
            
            <button
              onClick={handleNewRequest}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Request
            </button>
          </div>
        </div>

        {/* Real Stats */}
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {loadingStats ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white overflow-hidden shadow-sm rounded-lg animate-pulse">
                <div className="p-5">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))
          ) : stats ? (
            [
              { name: 'Total Requests', value: stats.total, color: 'text-blue-600' },
              { name: 'Pending', value: stats.pending, color: 'text-yellow-600' },
              { name: 'In Progress', value: stats.inProgress, color: 'text-purple-600' },
              { name: 'Cancelled', value: stats.cancelled, color: 'text-red-600' },
            ].map((item) => (
              <div key={item.name} className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-5">
                  <div className="text-sm font-medium text-gray-500 truncate">
                    {item.name}
                  </div>
                  <div className={`mt-1 text-2xl font-semibold ${item.color}`}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))
          ) : null}
        </div>


        {/* Requests Table */}
        <RequestTable
          onViewRequest={handleViewRequest}
          onDuplicateRequest={handleDuplicateRequest}
          onTrackRequest={handleTrackRequest}
          onStatsUpdate={loadStats}
        />

      </div>
    </BusinessLayout>
  );
}