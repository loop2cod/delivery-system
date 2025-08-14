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

  const columns = useMemo<ColumnDef<DeliveryRequest>[]>(
    () => [
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
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              value={globalFilter ?? ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Search requests..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => handlePriorityFilterChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
          >
            <option value="">All Priority</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {(statusFilter || priorityFilter || globalFilter) && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${pagination.total} requests`}
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
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
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                <span>{status.replace('_', ' ')}</span>
                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-xs',
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
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
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
              <div className="flex items-center space-x-2">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {(() => {
                    const pages = [];
                    const startPage = Math.max(1, pagination.page - 2);
                    const endPage = Math.min(pagination.pages, pagination.page + 2);

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setPagination(prev => ({ ...prev, page: i }))}
                          className={clsx(
                            'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
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
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.pages }))}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </nav>

                <select
                  value={pagination.limit}
                  onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
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