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
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
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

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

interface DeliveryTableProps {
  deliveries: DeliveryRequest[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search: string;
    priority: string;
  };
  onViewDelivery: (delivery: DeliveryRequest) => void;
  onTrackDelivery: (delivery: DeliveryRequest) => void;
  onDownloadProof: (delivery: DeliveryRequest) => void;
  onFilterChange: (key: string, value: string) => void;
  onPageChange: (page: number) => void;
}

export function DeliveryTable({
  deliveries,
  loading,
  pagination,
  filters,
  onViewDelivery,
  onTrackDelivery,
  onDownloadProof,
  onFilterChange,
  onPageChange,
}: DeliveryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<DeliveryRequest>[]>(
    () => [
      {
        accessorKey: 'requestNumber',
        header: 'Delivery ID',
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
        accessorKey: 'deliveredAt',
        header: 'Delivered',
        cell: ({ row }) => {
          const deliveredDate = new Date(row.original.deliveredAt || row.original.createdAt);
          return (
            <div className="text-sm">
              <div className="flex items-center text-green-600 font-medium">
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                <span>{deliveredDate.toLocaleDateString()}</span>
              </div>
              <div className="text-xs text-gray-500 ml-5">
                {deliveredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'actualCost',
        header: 'Final Cost',
        cell: ({ row }) => (
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              AED {row.original.actualCost || row.getValue('actualCost') || row.original.estimatedCost}
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
        accessorKey: 'assignedDriver',
        header: 'Driver',
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.assignedDriver ? (
              <div>
                <div className="font-medium text-gray-900">
                  {row.original.assignedDriver.name}
                </div>
                <div className="text-xs text-gray-500">
                  {row.original.assignedDriver.phone}
                </div>
              </div>
            ) : (
              <span className="text-gray-400">Not assigned</span>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center space-x-2 min-w-[140px]">
            <button
              onClick={() => onViewDelivery(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onTrackDelivery(row.original)}
              className="p-1 text-blue-400 hover:text-blue-600"
              title="View Tracking"
            >
              <MapPinIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDownloadProof(row.original)}
              className="p-1 text-green-400 hover:text-green-600"
              title="Download Proof"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [onViewDelivery, onTrackDelivery, onDownloadProof]
  );

  const table = useReactTable({
    data: deliveries,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Search deliveries..."
            />
          </div>

          <select
            value={filters.priority}
            onChange={(e) => onFilterChange('priority', e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
          >
            <option value="">All Priority</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${pagination.total} deliveries`}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-gray-600">Loading deliveries...</span>
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
        
        {!loading && deliveries.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No deliveries found</h3>
              <p className="mt-1 text-sm text-gray-500">No completed deliveries to display yet.</p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
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
                    onClick={() => onPageChange(1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => onPageChange(Math.min(pagination.pages, pagination.page + 1))}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => onPageChange(pagination.pages)}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}