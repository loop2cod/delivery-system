'use client';

import { useState, useMemo } from 'react';
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

const mockRequests: DeliveryRequest[] = [
  {
    id: 'REQ-2024-001',
    internalReference: 'TECH-001',
    serviceType: 'Same-Day Delivery',
    priority: 'urgent',
    status: 'in_transit',
    pickupAddress: 'TechCorp Solutions, Business Bay',
    deliveryAddress: 'Client Office, DIFC',
    pickupDate: '2024-01-15T10:00:00Z',
    deliveryDate: '2024-01-15T16:00:00Z',
    estimatedCost: 'AED 45',
    actualCost: 'AED 45',
    itemCount: 2,
    createdAt: '2024-01-15T08:30:00Z',
    createdBy: 'Sarah Johnson',
    assignedDriver: {
      name: 'Omar Hassan',
      phone: '+971-50-123-4567',
    },
  },
  {
    id: 'REQ-2024-002',
    internalReference: 'TECH-002',
    serviceType: 'Document Delivery',
    priority: 'high',
    status: 'delivered',
    pickupAddress: 'TechCorp Solutions, Business Bay',
    deliveryAddress: 'Government Office, Abu Dhabi',
    pickupDate: '2024-01-14T09:00:00Z',
    deliveryDate: '2024-01-14T15:00:00Z',
    estimatedCost: 'AED 120',
    actualCost: 'AED 115',
    itemCount: 1,
    createdAt: '2024-01-14T07:15:00Z',
    createdBy: 'Mike Chen',
    assignedDriver: {
      name: 'Ahmed Ali',
      phone: '+971-56-789-0123',
    },
  },
  {
    id: 'REQ-2024-003',
    serviceType: 'Express Delivery',
    priority: 'normal',
    status: 'submitted',
    pickupAddress: 'TechCorp Solutions, Business Bay',
    deliveryAddress: 'Partner Company, Sharjah',
    pickupDate: '2024-01-16T11:00:00Z',
    deliveryDate: '2024-01-16T17:00:00Z',
    estimatedCost: 'AED 85',
    itemCount: 3,
    createdAt: '2024-01-15T14:20:00Z',
    createdBy: 'Sarah Johnson',
  },
  {
    id: 'REQ-2024-004',
    internalReference: 'TECH-004',
    serviceType: 'Fragile Items',
    priority: 'high',
    status: 'assigned',
    pickupAddress: 'TechCorp Solutions, Business Bay',
    deliveryAddress: 'Exhibition Center, Dubai',
    pickupDate: '2024-01-17T10:00:00Z',
    deliveryDate: '2024-01-17T14:00:00Z',
    estimatedCost: 'AED 95',
    itemCount: 1,
    createdAt: '2024-01-15T16:45:00Z',
    createdBy: 'David Wilson',
    assignedDriver: {
      name: 'Mohammed Al Rashid',
      phone: '+971-52-456-7890',
    },
  },
  {
    id: 'REQ-2024-005',
    serviceType: 'Same-Day Delivery',
    priority: 'normal',
    status: 'draft',
    pickupAddress: 'TechCorp Solutions, Business Bay',
    deliveryAddress: 'Client Office, Marina',
    pickupDate: '2024-01-18T09:00:00Z',
    deliveryDate: '2024-01-18T15:00:00Z',
    estimatedCost: 'AED 55',
    itemCount: 2,
    createdAt: '2024-01-15T17:30:00Z',
    createdBy: 'Sarah Johnson',
  },
];

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-yellow-100 text-yellow-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
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

  const columns = useMemo<ColumnDef<DeliveryRequest>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Request ID',
        cell: ({ row }) => (
          <div>
            <span className="font-mono text-sm text-gray-900">
              {row.getValue('id')}
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
        accessorKey: 'serviceType',
        header: 'Service',
        cell: ({ row }) => (
          <div>
            <div className="text-sm text-gray-900">
              {row.getValue('serviceType')}
            </div>
            <div className="text-xs text-gray-500">
              {row.original.itemCount} item{row.original.itemCount !== 1 ? 's' : ''}
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
              {row.original.actualCost || row.getValue('estimatedCost')}
            </div>
            {row.original.actualCost && row.original.actualCost !== row.original.estimatedCost && (
              <div className="text-xs text-gray-500">
                Est: {row.original.estimatedCost}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'createdBy',
        header: 'Created By',
        cell: ({ row }) => {
          const createdDate = new Date(row.original.createdAt);
          return (
            <div className="text-sm">
              <div className="text-gray-900">{row.getValue('createdBy')}</div>
              <div className="text-xs text-gray-500">
                {createdDate.toLocaleDateString()}
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
            {['submitted', 'assigned', 'picked_up', 'in_transit'].includes(row.original.status) && (
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
    data: mockRequests,
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
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Search requests..."
            />
          </div>
          
          <select
            value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
            onChange={(e) =>
              table.getColumn('status')?.setFilterValue(e.target.value)
            }
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="assigned">Assigned</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={(table.getColumn('priority')?.getFilterValue() as string) ?? ''}
            onChange={(e) =>
              table.getColumn('priority')?.setFilterValue(e.target.value)
            }
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
          >
            <option value="">All Priority</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {table.getFilteredRowModel().rows.length} of{' '}
          {table.getCoreRowModel().rows.length} requests
        </div>
      </div>

      {/* Request Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(statusColors).map(([status, colorClass]) => {
          const count = mockRequests.filter(r => r.status === status).length;
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
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}