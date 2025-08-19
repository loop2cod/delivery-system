'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { RequestsTable } from '@/components/requests/RequestsTable';
import { AssignDriverModal } from '@/components/requests/AssignDriverModal';
import { adminAPI, DeliveryRequest, Driver } from '@/lib/api';
import toast from 'react-hot-toast';

export default function RequestsPage() {
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    companyId: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  // Modals (only for assign driver, removed view modal)
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequest | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);

  // Fetch requests
  const fetchRequests = async (page = 1) => {
    try {
      setLoading(true);
      const data = await adminAPI.getDeliveryRequests({
        page,
        limit: pagination.limit,
        ...filters
      });
      
      setRequests(data.requests);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Failed to load requests');
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
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 when filtering
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchRequests(page);
  };

  // Handle request actions (removed handleViewRequest since we're using detail page now)

  const handleAssignDriver = (request: DeliveryRequest) => {
    setSelectedRequest(request);
    fetchAvailableDrivers();
    setIsAssignModalOpen(true);
  };

  const handleStatusUpdate = async (requestId: string, status: DeliveryRequest['status'], notes?: string) => {
    try {
      await adminAPI.updateDeliveryRequestStatus(requestId, {
        status,
        notes
      });
      
      toast.success(`Request status updated to ${status.toLowerCase()}`);
      fetchRequests(pagination.page);
    } catch (error) {
      toast.error('Failed to update request status');
    }
  };

  const handleDriverAssignment = async (requestId: string, driverId: string, notes?: string) => {
    try {
      const response = await adminAPI.assignDriverToRequest(requestId, {
        driverId,
        notes
      });
      
      toast.success(`Driver assigned successfully`);
      setIsAssignModalOpen(false);
      fetchRequests(pagination.page);
    } catch (error) {
      toast.error('Failed to assign driver');
    }
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      companyId: '',
      search: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delivery Requests</h1>
            <p className="text-gray-600">
              Manage delivery requests from businesses
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {pagination.total} total requests
            </span>
          </div>
        </div>

        {/* Requests Table */}
        <RequestsTable
          requests={requests}
          loading={loading}
          pagination={pagination}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          onPageChange={handlePageChange}
          onViewRequest={() => {}} // Not used anymore, navigation handled in table
          onAssignDriver={handleAssignDriver}
          onStatusUpdate={handleStatusUpdate}
        />

        {/* Assign Driver Modal */}
        <AssignDriverModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          request={selectedRequest}
          availableDrivers={availableDrivers}
          onAssign={handleDriverAssignment}
        />
      </div>
    </AdminLayout>
  );
}