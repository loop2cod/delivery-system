'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/providers/BusinessProvider';
import { BusinessLayout } from '@/components/layout/BusinessLayout';
import { businessAPI } from '@/lib/api';
import { toast } from '@/lib/toast';
import { DeliveryTable } from '@/components/deliveries/DeliveryTable';
import {
  TruckIcon,
  CheckCircleIcon,
  MapPinIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface DeliveryRequest {
  id: string;
  requestNumber: string;
  internalReference?: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'DELIVERED';
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: string;
  deliveryDate: string;
  estimatedCost: number;
  actualCost?: number;
  totalWeight: number;
  items: any[];
  createdAt: string;
  deliveredAt?: string;
  assignedDriver?: {
    name: string;
    phone: string;
  };
}

interface DeliveryStats {
  totalDeliveries: number;
  thisMonthDeliveries: number;
  totalValue: number;
  averageDeliveryTime: number;
}

export default function DeliveriesPage() {
  const { isAuthenticated, isLoading } = useBusiness();
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    priority: '',
  });
  const [stats, setStats] = useState<DeliveryStats>({
    totalDeliveries: 0,
    thisMonthDeliveries: 0,
    totalValue: 0,
    averageDeliveryTime: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDeliveries();
    }
  }, [isAuthenticated, pagination.page, pagination.limit, filters]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await businessAPI.getRequests({
        page: pagination.page,
        limit: pagination.limit,
        status: 'DELIVERED',
        search: filters.search || undefined,
      });
      
      setDeliveries(response.requests);
      setPagination(response.pagination);
      
      // Calculate stats from current page data (simplified)
      setStats({
        totalDeliveries: response.pagination.total,
        thisMonthDeliveries: response.requests.filter((d: any) => {
          const deliveredDate = new Date(d.deliveredAt || d.createdAt);
          const thisMonth = new Date();
          thisMonth.setDate(1);
          thisMonth.setHours(0, 0, 0, 0);
          return deliveredDate >= thisMonth;
        }).length,
        totalValue: response.requests.reduce((sum: number, d: any) => 
          sum + (d.actualCost || d.estimatedCost || 0), 0
        ),
        averageDeliveryTime: 0,
      });
    } catch (error) {
      console.error('Failed to load deliveries:', error);
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDelivery = (delivery: DeliveryRequest) => {
    router.push(`/requests/${delivery.id}`);
  };

  const handleTrackDelivery = (delivery: DeliveryRequest) => {
    toast.success(`Viewing delivery details for ${delivery.requestNumber}`);
  };

  const handleDownloadProof = (delivery: DeliveryRequest) => {
    toast.success(`Downloading delivery proof for ${delivery.requestNumber}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
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

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <TruckIcon className="h-8 w-8 text-primary mr-3" />
              My Deliveries
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track and manage your completed deliveries
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stats-card">
            <div className="flex items-center">
              <CheckCircleIcon className="stats-icon text-green-500" />
              <div className="ml-4">
                <p className="stats-label">Total Deliveries</p>
                <p className="stats-value">{stats.totalDeliveries}</p>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center">
              <TruckIcon className="stats-icon text-blue-500" />
              <div className="ml-4">
                <p className="stats-label">This Month</p>
                <p className="stats-value">{stats.thisMonthDeliveries}</p>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center">
              <DocumentTextIcon className="stats-icon text-purple-500" />
              <div className="ml-4">
                <p className="stats-label">Total Value</p>
                <p className="stats-value">AED {stats.totalValue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center">
              <MapPinIcon className="stats-icon text-orange-500" />
              <div className="ml-4">
                <p className="stats-label">Avg. Rating</p>
                <p className="stats-value">4.8 ⭐</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deliveries Table */}
        <DeliveryTable
          deliveries={deliveries}
          loading={loading}
          pagination={pagination}
          filters={filters}
          onViewDelivery={handleViewDelivery}
          onTrackDelivery={handleTrackDelivery}
          onDownloadProof={handleDownloadProof}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
        />
      </div>
    </BusinessLayout>
  );
}