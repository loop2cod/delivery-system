'use client';

import { useState } from 'react';
import { 
  EyeIcon, 
  UserPlusIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { DeliveryRequest } from '@/lib/api';
import { formatDate, getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel } from '@/lib/api';

interface RequestsTableProps {
  requests: DeliveryRequest[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    status: string;
    priority: string;
    companyId: string;
    search: string;
    dateFrom: string;
    dateTo: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onViewRequest: (requestId: string) => void;
  onAssignDriver: (request: DeliveryRequest) => void;
  onStatusUpdate: (requestId: string, status: DeliveryRequest['status'], notes?: string) => void;
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function RequestsTable({
  requests,
  loading,
  pagination,
  filters,
  onFilterChange,
  onClearFilters,
  onPageChange,
  onViewRequest,
  onAssignDriver,
  onStatusUpdate
}: RequestsTableProps) {
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const handleQuickStatusUpdate = async (request: DeliveryRequest, newStatus: DeliveryRequest['status']) => {
    await onStatusUpdate(request.id, newStatus);
  };

  const getQuickActions = (request: DeliveryRequest) => {
    const actions = [];

    if (request.status === 'PENDING') {
      actions.push(
        <Button
          key="assign"
          size="sm"
          variant="outline"
          onClick={() => onAssignDriver(request)}
          className="text-xs"
        >
          <UserPlusIcon className="h-3 w-3 mr-1" />
          Assign
        </Button>
      );
    }

    if (['PENDING', 'ASSIGNED'].includes(request.status)) {
      actions.push(
        <Button
          key="picked-up"
          size="sm"
          variant="outline"
          onClick={() => handleQuickStatusUpdate(request, 'PICKED_UP')}
          className="text-xs"
        >
          Pick Up
        </Button>
      );
    }

    if (request.status === 'PICKED_UP') {
      actions.push(
        <Button
          key="in-transit"
          size="sm"
          variant="outline"
          onClick={() => handleQuickStatusUpdate(request, 'IN_TRANSIT')}
          className="text-xs"
        >
          In Transit
        </Button>
      );
    }

    if (['IN_TRANSIT', 'PICKED_UP'].includes(request.status)) {
      actions.push(
        <Button
          key="delivered"
          size="sm"
          variant="outline"
          onClick={() => handleQuickStatusUpdate(request, 'DELIVERED')}
          className="text-xs bg-green-50 text-green-700 hover:bg-green-100"
        >
          Delivered
        </Button>
      );
    }

    return actions;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-900">Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {Object.values(filters).filter(v => v).length} active
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-xs"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <Input
                placeholder="Request number, address..."
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) => onFilterChange('status', value)}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <Select
                value={filters.priority}
                onValueChange={(value) => onFilterChange('priority', value)}
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <BuildingOfficeIcon className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No requests found</p>
                      <p className="text-sm">Try adjusting your filters to see more results</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request) => {
                  const dateInfo = formatDate(request.createdAt);
                  const scheduleDateInfo = formatDate(request.pickupDate);
                  
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {request.requestNumber}
                          </span>
                          <span className="text-xs text-gray-500">
                            {request.items.length} item{request.items.length !== 1 ? 's' : ''} • {request.totalWeight}kg
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {request.company?.name || 'Unknown Company'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {request.company?.contactPerson}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 truncate max-w-xs">
                            <strong>From:</strong> {request.pickupAddress}
                          </div>
                          <div className="text-gray-500 truncate max-w-xs">
                            <strong>To:</strong> {request.deliveryAddress}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusLabel(request.status)}
                          </Badge>
                          <Badge className={getPriorityColor(request.priority)}>
                            {getPriorityLabel(request.priority)}
                          </Badge>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="text-gray-900">
                            AED {request.actualCost || request.estimatedCost || 0}
                          </div>
                          <div className="text-xs text-gray-500">
                            {request.actualCost ? 'Actual' : 'Estimated'}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="text-gray-900 flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {scheduleDateInfo.date}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {request.pickupTime}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/requests/${request.id}`)}
                            className="text-xs"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          
                          {getQuickActions(request).map((action, index) => (
                            <div key={index}>{action}</div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="text-xs"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </Button>
                
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="text-xs"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}