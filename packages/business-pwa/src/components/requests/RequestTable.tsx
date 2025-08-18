'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  CalendarIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { businessAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface DeliveryRequest {
  id: string;
  requestNumber: string;
  internalReference?: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'CANCELLED';
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: string;
  deliveryDate: string;
  pickupTime?: string;
  deliveryTime?: string;
  estimatedCost: number;
  actualCost?: number;
  totalWeight: number;
  items: any[];
  totalCODAmount?: number;
  createdAt: string;
  createdBy?: string;
  assignedDriver?: {
    name: string;
    phone: string;
  };
  pickupContactName?: string;
  pickupPhone?: string;
  deliveryContactName?: string;
  deliveryPhone?: string;
}


const statusColors = {
  PENDING: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  PICKED_UP: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

interface RequestTableProps {
  onViewRequest: (request: DeliveryRequest) => void;
  onDuplicateRequest: (request: DeliveryRequest) => void;
  onTrackRequest: (request: DeliveryRequest) => void;
  onStatsUpdate?: () => void;
}

export function RequestTable({
  onViewRequest,
  onDuplicateRequest,
  onTrackRequest,
  onStatsUpdate,
}: RequestTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  // Load requests data
  useEffect(() => {
    loadRequests();
  }, [pagination.page, pagination.limit, statusFilter, priorityFilter, globalFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Always exclude DELIVERED requests from Request History
      if (statusFilter && statusFilter !== 'DELIVERED') {
        params.status = statusFilter;
      }
      if (globalFilter) params.search = globalFilter;

      const response = await businessAPI.getRequests(params);

      // Filter out DELIVERED requests on client side as well
      const filteredRequests = response.requests.filter(
        (request: any) => request.status !== 'DELIVERED'
      );

      setRequests(filteredRequests);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        pages: response.pagination.pages
      }));

      // Update parent stats when data changes
      if (onStatsUpdate) {
        onStatsUpdate();
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePriorityFilterChange = (priority: string) => {
    setPriorityFilter(priority);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchChange = (search: string) => {
    setGlobalFilter(search);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearAllFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setGlobalFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
    } else {
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all requests on current page
      const currentPageRequests = table.getRowModel().rows.map(row => row.original.id);
      setSelectedRequests(prev => {
        const combined = [...prev, ...currentPageRequests];
        const newSelection = Array.from(new Set(combined));
        return newSelection;
      });
    } else {
      // Deselect all requests on current page
      const currentPageRequests = table.getRowModel().rows.map(row => row.original.id);
      setSelectedRequests(prev => prev.filter(id => !currentPageRequests.includes(id)));
    }
  };

  // Check if all current page rows are selected
  const isAllCurrentPageSelected = () => {
    const currentPageRequests = table.getRowModel().rows.map(row => row.original.id);
    return currentPageRequests.length > 0 && currentPageRequests.every(id => selectedRequests.includes(id));
  };

  // Check if some current page rows are selected
  const isSomeCurrentPageSelected = () => {
    const currentPageRequests = table.getRowModel().rows.map(row => row.original.id);
    return currentPageRequests.some(id => selectedRequests.includes(id));
  };

  const handlePrintLabels = () => {
    if (selectedRequests.length === 0) {
      toast.error('Please select at least one request to print labels');
      return;
    }

    const selectedRequestsData = requests.filter(r => selectedRequests.includes(r.id));
    printDeliveryLabels(selectedRequestsData);
  };

  const columns = useMemo<ColumnDef<DeliveryRequest>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={isAllCurrentPageSelected()}
            onCheckedChange={(checked) => handleSelectAll(!!checked)}
            aria-label="Select all requests"
            className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
            ref={(el) => {
              if (el && el.dataset) {
                el.dataset.state = isSomeCurrentPageSelected() && !isAllCurrentPageSelected() ? 'indeterminate' : el.dataset.state;
              }
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedRequests.includes(row.original.id)}
            onCheckedChange={(checked) => handleSelectRequest(row.original.id, !!checked)}
            aria-label={`Select request ${row.getValue('requestNumber')}`}
          />
        ),
      },
      {
        accessorKey: 'requestNumber',
        header: 'Request ID',
        cell: ({ row }) => (
          <div>
            <span className="font-mono text-sm text-gray-900">
              {row.getValue('requestNumber')}
            </span>
            {row.original.internalReference && (
              <div className="text-xs text-gray-500">
                Ref: {row.original.internalReference}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'totalWeight',
        header: 'Items & Weight',
        cell: ({ row }) => {
          const codItems = row.original.items?.filter((item: any) => item.paymentType === 'cod') || [];
          const totalCOD = codItems.reduce((sum: number, item: any) => sum + (item.codAmount || 0), 0);

          return (
            <div>
              <div className="text-sm text-gray-900">
                {row.original.items?.length || 0} item{(row.original.items?.length || 0) !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-gray-500">
                {row.original.totalWeight?.toFixed(1) || '0'} kg
              </div>
              {codItems.length > 0 && (
                <div className="text-xs text-orange-600 font-medium">
                  COD: AED {totalCOD.toFixed(2)}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
              priorityColors[row.getValue('priority') as keyof typeof priorityColors]
            )}
          >
            {row.getValue('priority')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
              statusColors[row.getValue('status') as keyof typeof statusColors]
            )}
          >
            {(row.getValue('status') as string).replace('_', ' ')}
          </span>
        ),
      },
      {
        accessorKey: 'pickupAddress',
        header: 'Route',
        cell: ({ row }) => (
          <div className="min-w-[200px] max-w-xs">
            <div className="text-sm text-gray-900 truncate flex items-start">
              <MapPinIcon className="w-4 h-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
              <span className="truncate">{row.original.pickupAddress}</span>
            </div>
            <div className="text-sm text-gray-500 truncate flex items-start mt-1">
              <MapPinIcon className="w-4 h-4 text-red-500 mr-1 mt-0.5 flex-shrink-0" />
              <span className="truncate">{row.original.deliveryAddress}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'pickupDate',
        header: 'Schedule',
        cell: ({ row }) => {
          const pickupDate = new Date(row.original.pickupDate);
          const deliveryDate = new Date(row.original.deliveryDate);
          return (
            <div className="text-sm">
              <div className="flex items-center text-gray-900">
                <CalendarIcon className="w-4 h-4 text-gray-400 mr-1" />
                <span>{pickupDate.toLocaleDateString()}</span>
              </div>
              <div className="text-xs text-gray-500 ml-5">
                {pickupDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {' '}
                {deliveryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'estimatedCost',
        header: 'Cost',
        cell: ({ row }) => (
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              AED {row.original.actualCost || row.getValue('estimatedCost')}
            </div>
            {row.original.actualCost && row.original.actualCost !== row.original.estimatedCost && (
              <div className="text-xs text-gray-500">
                Est: AED {row.original.estimatedCost}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => {
          const createdDate = new Date(row.original.createdAt);
          return (
            <div className="text-sm">
              <div className="text-gray-900">
                {createdDate.toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500">
                {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center space-x-2 min-w-[120px]">
            <button
              onClick={() => onViewRequest(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDuplicateRequest(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Duplicate Request"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </button>
            {['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(row.original.status) && (
              <button
                onClick={() => onTrackRequest(row.original)}
                className="p-1 text-blue-400 hover:text-blue-600"
                title="Track Request"
              >
                <MapPinIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [onViewRequest, onDuplicateRequest, onTrackRequest]
  );

  const table = useReactTable({
    data: requests,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              value={globalFilter ?? ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Search requests..."
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          {selectedRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <button
                onClick={handlePrintLabels}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Labels ({selectedRequests.length})
              </button>
              <button
                onClick={() => setSelectedRequests([])}
                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          )}
          <div className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${pagination.total} requests`}
          </div>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-sm font-medium text-blue-900">
                {selectedRequests.length} request{selectedRequests.length !== 1 ? 's' : ''} selected for printing
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  // Select all requests across all pages
                  setSelectedRequests(requests.map(r => r.id));
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Select All on Page
              </button>
              <button
                onClick={() => setSelectedRequests([])}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filter Buttons */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-medium text-gray-900">Quick Filters</h3>
          <div className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${pagination.total} total requests`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusFilterChange('')}
            className={clsx(
              'px-3 py-2 rounded-md text-sm font-medium transition-colors',
              !statusFilter
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            All Requests
          </button>
          {Object.entries(statusColors).map(([status, colorClass]) => {
            const count = requests.filter(r => r.status === status).length;
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => handleStatusFilterChange(status)}
                className={clsx(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 min-w-0',
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                <span className="truncate">{status.replace('_', ' ')}</span>
                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-xs flex-shrink-0',
                  isActive ? 'bg-white/20 text-white' : colorClass
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-gray-600">Loading requests...</span>
          </div>
        )}
        {!loading && (
          <>            
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              <div className="divide-y divide-gray-200">
                {table.getRowModel().rows.map((row) => (
                  <div key={row.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedRequests.includes(row.original.id)}
                          onCheckedChange={(checked) => handleSelectRequest(row.original.id, !!checked)}
                          aria-label={`Select request ${row.getValue('requestNumber')}`}
                        />
                        <div>
                          <div className="font-mono text-sm font-medium text-gray-900">
                            {row.getValue('requestNumber')}
                          </div>
                          {row.original.internalReference && (
                            <div className="text-xs text-gray-500">
                              Ref: {row.original.internalReference}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => onViewRequest(row.original)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDuplicateRequest(row.original)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
                          title="Duplicate Request"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        {['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(row.original.status) && (
                          <button
                            onClick={() => onTrackRequest(row.original)}
                            className="p-2 text-blue-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                            title="Track Request"
                          >
                            <MapPinIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        priorityColors[row.getValue('priority') as keyof typeof priorityColors]
                      )}>
                        {row.getValue('priority')}
                      </span>
                      <span className={clsx(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        statusColors[row.getValue('status') as keyof typeof statusColors]
                      )}>
                        {(row.getValue('status') as string).replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start text-sm">
                        <MapPinIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-900">{row.original.pickupAddress}</span>
                      </div>
                      <div className="flex items-start text-sm">
                        <MapPinIcon className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-900">{row.original.deliveryAddress}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between text-xs text-gray-500 gap-2">
                      <div>
                        {row.original.items?.length || 0} item{(row.original.items?.length || 0) !== 1 ? 's' : ''} • {row.original.totalWeight?.toFixed(1) || '0'} kg
                      </div>
                      <div className="font-medium text-gray-900">
                        AED {row.original.actualCost || row.getValue('estimatedCost')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="text-left whitespace-nowrap">
                          {header.isPlaceholder ? null : (
                            <div
                              className={clsx(
                                'flex items-center space-x-1',
                                header.column.getCanSort() && 'cursor-pointer select-none'
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <span>
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </span>
                              {{
                                asc: <ChevronUpIcon className="h-4 w-4" />,
                                desc: <ChevronDownIcon className="h-4 w-4" />,
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {!loading && requests.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first delivery request to get started.</p>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Pagination */}
      {!loading && (
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center order-2 sm:order-1">
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.total}</span>{' '}
                results
              </p>
            </div>

            {pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 order-1 sm:order-2">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {(() => {
                    const pages = [];
                    const startPage = Math.max(1, pagination.page - 1);
                    const endPage = Math.min(pagination.pages, pagination.page + 1);

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setPagination(prev => ({ ...prev, page: i }))}
                          className={clsx(
                            'relative inline-flex items-center px-3 sm:px-4 py-2 border text-xs sm:text-sm font-medium',
                            i === pagination.page
                              ? 'z-10 bg-primary border-primary text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          )}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}

                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.pages }))}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </nav>

                <select
                  value={pagination.limit}
                  onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-xs sm:text-sm focus:ring-primary focus:border-primary"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Print delivery labels function
const printDeliveryLabels = (requests: DeliveryRequest[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Please allow popups to print labels');
    return;
  }

  const currentDate = new Date().toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1 $4:$5:$6');

  const generateQRCode = (text: string, size: number = 100) => {
    // Using QR Server API for actual QR code generation
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png&ecc=M`;
  };

  const generateBarcode = (text: string) => {
    // Using TEC-IT barcode API for actual barcode generation
    return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(text)}&code=Code128&dpi=150&dataseparator=&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
  };

  const generateTrackingNumber = (requestNumber: string) => {
    // Generate a tracking number based on request number
    const prefix = 'JTE';
    const suffix = requestNumber.replace(/[^0-9]/g, '').slice(-8).padStart(8, '0');
    return `${prefix}${suffix}`;
  };

  const labelHTML = requests.map((request, index) => {
    const codItems = request.items?.filter((item: any) => item.paymentType === 'cod') || [];
    const totalCOD = codItems.reduce((sum: number, item: any) => sum + (item.codAmount || 0), 0);
    const hasFragileItems = request.items?.some((item: any) => item.fragile) || false;

    // Extract addresses (simplified - you might want to parse these better)
    const pickupParts = request.pickupAddress.split(',').map(s => s.trim());
    const deliveryParts = request.deliveryAddress.split(',').map(s => s.trim());

    const specialRequirements = [];
    if (hasFragileItems) specialRequirements.push('FRAGILE');
    if (totalCOD > 0) specialRequirements.push('CASH ON DELIVERY');

    return `
      <div class="label" style="
        width: 48%;
        height: 48vh;
        border: 2px solid #000;
        margin: 1%;
        padding: 8px;
        font-family: Arial, sans-serif;
        font-size: 10px;
        line-height: 1.2;
        page-break-inside: avoid;
        display: inline-block;
        vertical-align: top;
        box-sizing: border-box;
      ">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 4px;">
          <div style="font-weight: bold; font-size: 14px;">J&T EXPRESS LOGO</div>
          <div style="text-align: right;">
            <div style="font-weight: bold;">STANDARD</div>
            <div style="font-size: 8px;">Print Date: ${currentDate}</div>
          </div>
        </div>

        <!-- Tracking Info -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <div style="font-weight: bold; font-size: 12px;">AB01-AU005-001</div>
          <div style="font-weight: bold;">1/1</div>
        </div>

        <!-- Shipper Info -->
        <div style="margin-bottom: 8px;">
          <div style="font-weight: bold; margin-bottom: 2px;">Shipper:</div>
          <div style="font-weight: bold;">${request.pickupContactName || pickupParts[0] || 'Shipper Name'}</div>
          <div>${request.pickupPhone || '+971501234568'}</div>
          <div style="font-size: 9px;">${request.pickupAddress}</div>
        </div>

        <!-- Recipient Info -->
        <div style="margin-bottom: 8px;">
          <div style="font-weight: bold; margin-bottom: 2px;">Recipient:</div>
          <div style="font-weight: bold;">${request.deliveryContactName || deliveryParts[0] || 'Recipient Name'}</div>
          <div>${request.deliveryPhone || '+971501234568'}</div>
          <div style="font-size: 9px;">${request.deliveryAddress}</div>
        </div>

        <!-- Items List -->
        <div style="margin-bottom: 8px;">
          <div style="font-weight: bold; margin-bottom: 2px;">Items List:</div>
          ${request.items?.map((item: any) => `
            <div style="margin-left: 4px; font-size: 9px;">
              - Description: ${item.description}
              - Quantity: ${item.quantity}
              - Weight: ${item.weight || 0} kg
              ${item.dimensions ? `- Dimensions: ${item.dimensions}` : ''}
              ${item.paymentType === 'cod' ? `- COD Amount: ${item.codAmount || 0} AED` : ''}
              ${item.fragile ? '- Fragile: Yes' : ''}
            </div>
          `).join('') || ''}
        </div>

        <!-- QR Code and Barcode Section -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="text-align: center;">
            <div style="font-weight: bold; margin-bottom: 2px;">QR Code:</div>
            <div style="width: 60px; height: 60px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px;">
              🟦 QR Code
            </div>
          </div>
          <div style="flex: 1; margin-left: 8px;">
            <div style="font-weight: bold; margin-bottom: 2px;">${request.requestNumber}</div>
            <div style="font-weight: bold; margin-bottom: 4px;">Barcode:</div>
            <div style="border: 1px solid #ccc; padding: 4px; text-align: center; font-family: monospace;">
              ████████ JTE300332461385 ██████
            </div>
          </div>
        </div>

        <!-- Schedule Info -->
        <div style="margin-bottom: 6px; font-size: 9px;">
          <div>Pickup: ${new Date(request.pickupDate).toLocaleDateString()} at ${request.pickupTime || '00:00'}</div>
          <div>Delivery: ${new Date(request.deliveryDate).toLocaleDateString()} at ${request.deliveryTime || '00:00'}</div>
        </div>

        <!-- Reference and Special -->
        <div style="font-size: 9px; margin-bottom: 4px;">
          ${request.internalReference ? `<div>Internal Ref: ${request.internalReference}</div>` : ''}
          ${specialRequirements.length > 0 ? `<div style="font-weight: bold; color: red;">Special: ${specialRequirements.join(' | ')}</div>` : ''}
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #000; padding-top: 2px; text-align: center; font-size: 8px;">
          Customer Service: +97145435201
        </div>
      </div>
    `;
  }).join('');

  const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Delivery Labels - J&T Express</title>
      <style>
        @page {
          size: A4;
          margin: 8mm;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Arial', sans-serif;
          background: white;
        }
        .page {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
          gap: 2mm;
        }
        .label {
          width: calc(50% - 1mm);
          height: calc(50vh - 1mm);
          border: 2px solid #000;
          padding: 6mm;
          font-family: 'Arial', sans-serif;
          font-size: 9px;
          line-height: 1.3;
          page-break-inside: avoid;
          display: inline-block;
          vertical-align: top;
          box-sizing: border-box;
          background: white;
          position: relative;
        }
        .label-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #000;
          padding-bottom: 3mm;
          margin-bottom: 3mm;
        }
        .logo {
          font-weight: bold;
          font-size: 16px;
          color: #e31e24;
          letter-spacing: 1px;
        }
        .service-type {
          text-align: right;
          font-size: 10px;
        }
        .service-type .type {
          font-weight: bold;
          font-size: 12px;
          color: #000;
        }
        .tracking-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4mm;
          font-weight: bold;
        }
        .tracking-number {
          font-size: 11px;
          color: #000;
        }
        .sequence {
          font-size: 10px;
        }
        .contact-section {
          margin-bottom: 4mm;
          border-left: 3px solid #e31e24;
          padding-left: 3mm;
        }
        .contact-label {
          font-weight: bold;
          font-size: 10px;
          color: #e31e24;
          margin-bottom: 1mm;
        }
        .contact-name {
          font-weight: bold;
          font-size: 11px;
          color: #000;
          margin-bottom: 1mm;
        }
        .contact-phone {
          font-size: 10px;
          color: #333;
          margin-bottom: 1mm;
        }
        .contact-address {
          font-size: 8px;
          color: #555;
          line-height: 1.2;
        }
        .items-section {
          margin-bottom: 4mm;
          background: #f8f9fa;
          padding: 2mm;
          border-radius: 2px;
        }
        .items-title {
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 2mm;
          color: #000;
        }
        .item {
          font-size: 8px;
          margin-bottom: 1mm;
          color: #333;
        }
        .qr-barcode-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4mm;
          gap: 3mm;
        }
        .qr-container {
          text-align: center;
          flex-shrink: 0;
        }
        .qr-title {
          font-weight: bold;
          font-size: 8px;
          margin-bottom: 1mm;
        }
        .qr-code {
          width: 60px;
          height: 60px;
          border: 1px solid #ddd;
        }
        .barcode-container {
          flex: 1;
          min-width: 0;
        }
        .request-number {
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 2mm;
          color: #000;
        }
        .barcode-title {
          font-weight: bold;
          font-size: 8px;
          margin-bottom: 1mm;
        }
        .barcode {
          width: 100%;
          height: 30px;
          border: 1px solid #ddd;
          background: white;
        }
        .schedule-info {
          margin-bottom: 3mm;
          font-size: 8px;
          background: #f0f8ff;
          padding: 2mm;
          border-radius: 2px;
        }
        .schedule-item {
          margin-bottom: 1mm;
          color: #333;
        }
        .reference-special {
          font-size: 8px;
          margin-bottom: 3mm;
        }
        .internal-ref {
          color: #666;
          margin-bottom: 1mm;
        }
        .special-requirements {
          font-weight: bold;
          color: #e31e24;
          background: #fff5f5;
          padding: 1mm;
          border-radius: 2px;
        }
        .footer {
          border-top: 1px solid #000;
          padding-top: 2mm;
          text-align: center;
          font-size: 7px;
          color: #666;
          position: absolute;
          bottom: 6mm;
          left: 6mm;
          right: 6mm;
        }
        @media print {
          .page {
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: auto;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      ${Array.from({ length: Math.ceil(requests.length / 4) }, (_, pageIndex) => {
    const pageLabels = requests.slice(pageIndex * 4, (pageIndex + 1) * 4);
    return `
          <div class="page">
            ${pageLabels.map((request, index) => {
      const codItems = request.items?.filter((item: any) => item.paymentType === 'cod') || [];
      const totalCOD = codItems.reduce((sum: number, item: any) => sum + (item.codAmount || 0), 0);
      const hasFragileItems = request.items?.some((item: any) => item.fragile) || false;

      const pickupParts = request.pickupAddress.split(',').map(s => s.trim());
      const deliveryParts = request.deliveryAddress.split(',').map(s => s.trim());

      const specialRequirements = [];
      if (hasFragileItems) specialRequirements.push('FRAGILE HANDLING');
      if (totalCOD > 0) specialRequirements.push('CASH ON DELIVERY');

      const trackingNumber = generateTrackingNumber(request.requestNumber);
      const qrData = JSON.stringify({
        requestNumber: request.requestNumber,
        trackingNumber: trackingNumber,
        pickup: request.pickupAddress,
        delivery: request.deliveryAddress,
        cod: totalCOD > 0 ? totalCOD : null
      });

      return `
                <div class="label">
                  <!-- Header -->
                  <div class="label-header">
                    <div class="logo">J&T EXPRESS</div>
                    <div class="service-type">
                      <div class="type">STANDARD</div>
                      <div>Print: ${currentDate}</div>
                    </div>
                  </div>

                  <!-- Tracking Info -->
                  <div class="tracking-info">
                    <div class="tracking-number">AB01-AU005-001</div>
                    <div class="sequence">1/1</div>
                  </div>

                  <!-- Shipper Info -->
                  <div class="contact-section">
                    <div class="contact-label">SHIPPER</div>
                    <div class="contact-name">${request.pickupContactName || pickupParts[0] || 'Shipper Name'}</div>
                    <div class="contact-phone">${request.pickupPhone || '+971501234568'}</div>
                    <div class="contact-address">${request.pickupAddress}</div>
                  </div>

                  <!-- Recipient Info -->
                  <div class="contact-section">
                    <div class="contact-label">RECIPIENT</div>
                    <div class="contact-name">${request.deliveryContactName || deliveryParts[0] || 'Recipient Name'}</div>
                    <div class="contact-phone">${request.deliveryPhone || '+971501234568'}</div>
                    <div class="contact-address">${request.deliveryAddress}</div>
                  </div>

                  <!-- Items List -->
                  <div class="items-section">
                    <div class="items-title">ITEMS DETAILS</div>
                    ${request.items?.map((item: any) => `
                      <div class="item">
                        • ${item.description} | Qty: ${item.quantity} | Weight: ${item.weight || 0}kg
                        ${item.dimensions ? ` | Size: ${item.dimensions}` : ''}
                        ${item.paymentType === 'cod' ? ` | COD: AED ${item.codAmount || 0}` : ''}
                        ${item.fragile ? ' | FRAGILE' : ''}
                      </div>
                    `).join('') || '<div class="item">No items specified</div>'}
                  </div>

                  <!-- QR Code and Barcode Section -->
                  <div class="qr-barcode-section">
                    <div class="qr-container">
                      <div class="qr-title">QR CODE</div>
                      <img src="${generateQRCode(qrData, 60)}" alt="QR Code" class="qr-code" />
                    </div>
                    <div class="barcode-container">
                      <div class="request-number">${request.requestNumber}</div>
                      <div class="barcode-title">TRACKING: ${trackingNumber}</div>
                      <img src="${generateBarcode(trackingNumber)}" alt="Barcode" class="barcode" />
                    </div>
                  </div>

                  <!-- Schedule Info -->
                  <div class="schedule-info">
                    <div class="schedule-item"><strong>Pickup:</strong> ${new Date(request.pickupDate).toLocaleDateString()} at ${request.pickupTime || '00:00'}</div>
                    <div class="schedule-item"><strong>Delivery:</strong> ${new Date(request.deliveryDate).toLocaleDateString()} at ${request.deliveryTime || '00:00'}</div>
                  </div>

                  <!-- Reference and Special -->
                  <div class="reference-special">
                    ${request.internalReference ? `<div class="internal-ref">Internal Ref: ${request.internalReference}</div>` : ''}
                    ${specialRequirements.length > 0 ? `<div class="special-requirements">${specialRequirements.join(' | ')}</div>` : ''}
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    J&T Express UAE | Customer Service: +971-4-543-5201 | www.jtexpress.ae
                  </div>
                </div>
              `;
    }).join('')}
          </div>
        `;
  }).join('')}
    </body>
    </html>
  `;

  printWindow.document.write(printHTML);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  toast.success(`Printing ${requests.length} delivery labels`);
};