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
import { toast } from '@/lib/toast';
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
  const [rowSelection, setRowSelection] = useState({});

  // Load requests data
  useEffect(() => {
    loadRequests();
  }, [pagination.page, pagination.limit, statusFilter, globalFilter]);

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


  const handleSearchChange = (search: string) => {
    setGlobalFilter(search);
    setPagination(prev => ({ ...prev, page: 1 }));
  };



  const handlePrintLabels = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    
    if (selectedRows.length === 0) {
      toast.error('Please select at least one request to print labels');
      return;
    }

    const selectedRequestsData = selectedRows.map(row => row.original);
    console.log(`Printing ${selectedRequestsData.length} labels`);
    printDeliveryLabels(selectedRequestsData);
  };

  const columns = useMemo<ColumnDef<DeliveryRequest>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center w-full">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center w-full">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
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
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
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
          {Object.keys(rowSelection).length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <button
                onClick={handlePrintLabels}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Labels ({table.getFilteredSelectedRowModel().rows.length})
              </button>
              <button
                onClick={() => setRowSelection({})}
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
      {Object.keys(rowSelection).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-sm font-medium text-blue-900">
                {table.getFilteredSelectedRowModel().rows.length} request{table.getFilteredSelectedRowModel().rows.length !== 1 ? 's' : ''} selected for printing
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => table.toggleAllPageRowsSelected(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Select All on Page
              </button>
              <button
                onClick={() => setRowSelection({})}
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
                          checked={row.getIsSelected()}
                          onCheckedChange={(value) => row.toggleSelected(!!value)}
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




  const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Delivery Labels - GRS DELIVERY</title>
      <style>
        @page {
          size: A4;
          margin: 5mm;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Consolas', 'Courier New', monospace;
          background: white;
          font-size: 8pt;
          line-height: 1.1;
          color: #000;
        }
        .page {
          width: 210mm;
          height: 297mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 5mm;
          padding: 5mm;
          box-sizing: border-box;
          page-break-after: always;
        }
        .page:last-child {
          page-break-after: auto;
        }
        .label {
          width: 100mm;
          height: 141mm;
          border: 2px solid #000;
          padding: 3mm;
          box-sizing: border-box;
          background: white;
          position: relative;
          font-size: 8pt;
          line-height: 1.1;
          display: flex;
          flex-direction: column;
        }
        .label-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 2mm;
          margin-bottom: 2mm;
          background: linear-gradient(135deg, #f8fafc, #e2e8f0);
          margin: -3mm -3mm 2mm -3mm;
          padding: 2mm 3mm;
          border-radius: 1mm 1mm 0 0;
        }
        .logo {
          font-weight: 900;
          font-size: 14px;
          color: #1a365d;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .service-type {
          text-align: right;
          font-size: 8px;
        }
        .service-type .type {
          font-weight: bold;
          font-size: 10px;
          color: #000;
        }
        .tracking-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2mm;
          font-weight: bold;
        }
        .tracking-number {
          font-size: 9px;
          color: #000;
        }
        .sequence {
          font-size: 8px;
        }
        .contact-section {
          margin-bottom: 1.5mm;
          border: 1px solid #000;
          padding: 1mm;
        }
        .contact-label {
          font-weight: bold;
          font-size: 6pt;
          color: #000;
          text-transform: uppercase;
          border-bottom: 1px solid #ccc;
          margin-bottom: 0.5mm;
          padding-bottom: 0.5mm;
        }
        .contact-name {
          font-weight: bold;
          font-size: 7pt;
          color: #000;
          margin-bottom: 0.5mm;
        }
        .contact-phone {
          font-size: 6pt;
          color: #000;
          margin-bottom: 0.5mm;
        }
        .contact-address {
          font-size: 6pt;
          color: #000;
          line-height: 1.1;
          word-wrap: break-word;
        }
        .items-section {
          margin-bottom: 1.5mm;
          border: 1px solid #000;
          padding: 1mm;
        }
        .items-title {
          font-weight: bold;
          font-size: 5pt;
          margin-bottom: 0.5mm;
          color: #000;
          text-transform: uppercase;
          border-bottom: 1px solid #ccc;
          padding-bottom: 0.5mm;
        }
        .item {
          font-size: 4pt;
          margin-bottom: 0.5mm;
          color: #000;
          line-height: 1.0;
        }
        .schedule-qr-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2mm;
          gap: 1mm;
        }
        .schedule-info {
          flex: 1;
          font-size: 7px;
          background: #f0f8ff;
          padding: 1mm;
          border-radius: 1px;
        }
        .schedule-item {
          margin-bottom: 0.5mm;
          color: #333;
        }
        .qr-section {
          text-align: center;
          border: 1px solid #000;
          padding: 0.5mm;
          width: 25mm;
          flex-shrink: 0;
        }
        .qr-title {
          font-weight: bold;
          font-size: 5pt;
          margin-bottom: 0.5mm;
          color: #000;
          text-transform: uppercase;
        }
        .qr-code {
          width: 20mm;
          height: 20mm;
          border: 1px solid #000;
          display: block;
          margin: 0 auto;
        }
        .request-number {
          font-weight: bold;
          font-size: 6px;
          margin-bottom: 0.5mm;
          color: #000;
        }
        .reference-special {
          font-size: 6px;
          margin-bottom: 1mm;
        }
        .internal-ref {
          color: #666;
          margin-bottom: 0.5mm;
        }
        .special-requirements {
          font-weight: bold;
          font-size: 6px;
          color: #dc2626;
          padding: 0.5mm;
        }
        .weight-cost {
          display: flex;
          justify-content: space-between;
          font-size: 6pt;
          font-weight: bold;
          border: 1px solid #000;
          padding: 1mm;
          margin-bottom: 1.5mm;
          background: #f0f0f0;
        }
        .footer {
          border-top: 1px solid #000;
          padding-top: 1mm;
          text-align: center;
          font-size: 5pt;
          color: #000;
          margin-top: auto;
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
      ${(() => {
        const pages = [];
        for (let i = 0; i < requests.length; i += 4) {
          const pageRequests = requests.slice(i, i + 4);
          pages.push(`
            <div class="page">
              ${pageRequests.map((request) => {
      const codItems = request.items?.filter((item: any) => item.paymentType === 'cod') || [];
      const totalCOD = codItems.reduce((sum: number, item: any) => sum + (item.codAmount || 0), 0);
      const hasFragileItems = request.items?.some((item: any) => item.fragile) || false;

      const pickupParts = request.pickupAddress.split(',').map(s => s.trim());
      const deliveryParts = request.deliveryAddress.split(',').map(s => s.trim());

      const specialRequirements = [];
      if (hasFragileItems) specialRequirements.push('FRAGILE HANDLING');
      if (totalCOD > 0) specialRequirements.push('CASH ON DELIVERY');

      const qrData = `https://grsdeliver.com/req/${request.requestNumber}`;

      return `
                <div class="label">
                  <!-- Header -->
                  <div class="label-header">
                    <div class="logo">GRS DELIVERY</div>
                    <div class="service-type">
                      <div class="type">STANDARD</div>
                      <div>Print: ${currentDate}</div>
                    </div>
                  </div>

                  <!-- Tracking Info -->
                  <div class="tracking-info">
                    <div class="tracking-number">${request.requestNumber}</div>
                    <div class="sequence">1/1</div>
                  </div>

                  <!-- Weight & Cost -->
                  <div class="weight-cost">
                    <div>Weight: ${(request.totalWeight || 0).toFixed(1)}kg</div>
                    <div>Cost: AED ${(request.actualCost || request.estimatedCost || 0).toFixed(2)}</div>
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

                  <!-- Combined Schedule and QR Section -->
                  <div class="schedule-qr-section">
                    <!-- Schedule Info -->
                    <div class="schedule-info">
                      <div class="schedule-item"><strong>Pickup:</strong> ${(() => {
                        if (request.pickupDate && request.pickupDate !== 'null') {
                          const date = new Date(request.pickupDate);
                          return isNaN(date.getTime()) ? 'Flexible' : date.toLocaleDateString();
                        }
                        return 'Flexible';
                      })()} at ${request.pickupTime || 'TBD'}</div>
                      <div class="schedule-item"><strong>Delivery:</strong> ${(() => {
                        if (request.deliveryDate && request.deliveryDate !== 'null') {
                          const date = new Date(request.deliveryDate);
                          return isNaN(date.getTime()) ? 'Flexible' : date.toLocaleDateString();
                        }
                        return 'Flexible';
                      })()} at ${request.deliveryTime || 'TBD'}</div>
                    </div>
                    
                    <!-- QR Code Section -->
                    <div class="qr-section">
                      <div class="request-number">${request.requestNumber}</div>
                      <div class="qr-title">TRACK</div>
                      <img src="${generateQRCode(qrData, 70)}" alt="QR Code" class="qr-code" />
                    </div>
                  </div>

                  <!-- Reference and Special -->
                  <div class="reference-special">
                    ${request.internalReference ? `<div class="internal-ref">Internal Ref: ${request.internalReference}</div>` : ''}
                    ${specialRequirements.length > 0 ? `<div class="special-requirements">${specialRequirements.join(' | ')}</div>` : ''}
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    GRS DELIVERY SERVICES | Customer Service: +971-4-XXX-XXXX | www.grsdelivery.ae
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          `);
        }
        return pages.join('');
      })()}
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