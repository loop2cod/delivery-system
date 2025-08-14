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
  DELIVERED: 'bg-green-100 text-green-800',
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
}

export function RequestTable({
  onViewRequest,
  onDuplicateRequest,
  onTrackRequest,
}: RequestTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Load requests data
  useEffect(() => {
    loadRequests();
  }, [pagination.page, pagination.limit, statusFilter, globalFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await businessAPI.getRequests({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        search: globalFilter || undefined
      });
      
      setRequests(response.requests);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        pages: response.pagination.pages
      }));
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleSearchChange = (search: string) => {
    setGlobalFilter(search);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
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
        cell: ({ row }) => (
          <div>
            <div className="text-sm text-gray-900">
              {row.original.items?.length || 0} item{(row.original.items?.length || 0) !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-500">
              {row.original.totalWeight?.toFixed(1) || '0'} kg
            </div>
          </div>
        ),
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
          <div className="max-w-xs">
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
          <div className="flex items-center space-x-2">
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
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
          >
            <option value="">All Priority</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${pagination.total} requests`}
        </div>
      </div>

      {/* Request Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        {Object.entries(statusColors).map(([status, colorClass]) => {
          const count = requests.filter(r => r.status === status).length;
          return (
            <div key={status} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {status.replace('_', ' ')}
                </span>
                <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', colorClass)}>
                  {count}
                </span>
              </div>
            </div>
          );
        })}
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
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
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
            disabled={pagination.page === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
            disabled={pagination.page === pagination.pages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.pages }))}
            disabled={pagination.page === pagination.pages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Page {pagination.page} of {pagination.pages}
          </span>
          <select
            value={pagination.limit}
            onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {[10, 20, 30, 40, 50].map((limit) => (
              <option key={limit} value={limit}>
                Show {limit}
              </option>
            ))}
          </select>
        </div>
      </div>
      )}
    </div>
  );
}