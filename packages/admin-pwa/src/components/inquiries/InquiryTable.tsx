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
  PhoneIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface Inquiry {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  service: string;
  pickup: string;
  delivery: string;
  priority: 'normal' | 'urgent' | 'express';
  status: 'new' | 'contacted' | 'quoted' | 'assigned' | 'completed' | 'cancelled';
  createdAt: string;
  estimatedValue: string;
  description: string;
  preferredTime: string;
}

const mockInquiries: Inquiry[] = [
  {
    id: 'INQ-2024-001',
    customerName: 'Sarah Johnson',
    phone: '+971-50-123-4567',
    email: 'sarah.johnson@email.com',
    service: 'Same-Day Delivery',
    pickup: 'Dubai Mall, Downtown Dubai',
    delivery: 'Business Bay Tower, Business Bay',
    priority: 'urgent',
    status: 'new',
    createdAt: '2024-01-15T10:30:00Z',
    estimatedValue: 'AED 45',
    description: 'Fragile electronics package, requires careful handling',
    preferredTime: 'Today before 5 PM',
  },
  {
    id: 'INQ-2024-002',
    customerName: 'Mohammed Al Rashid',
    phone: '+971-56-789-0123',
    email: 'mohammed.rashid@company.ae',
    service: 'Document Delivery',
    pickup: 'DIFC Gate District',
    delivery: 'Abu Dhabi Mall, Abu Dhabi',
    priority: 'express',
    status: 'contacted',
    createdAt: '2024-01-15T09:15:00Z',
    estimatedValue: 'AED 120',
    description: 'Legal documents for court filing, urgent delivery required',
    preferredTime: 'Tomorrow morning',
  },
  {
    id: 'INQ-2024-003',
    customerName: 'Fatima Hassan',
    phone: '+971-52-456-7890',
    email: 'fatima.hassan@gmail.com',
    service: 'Fragile Items',
    pickup: 'Sharjah City Centre, Sharjah',
    delivery: 'Ajman City Centre, Ajman',
    priority: 'normal',
    status: 'quoted',
    createdAt: '2024-01-15T08:45:00Z',
    estimatedValue: 'AED 85',
    description: 'Ceramic vase collection, multiple items',
    preferredTime: 'This weekend',
  },
  {
    id: 'INQ-2024-004',
    customerName: 'Ahmed Ali',
    phone: '+971-50-987-6543',
    email: 'ahmed.ali@business.ae',
    service: 'Express Delivery',
    pickup: 'Marina Mall, Dubai Marina',
    delivery: 'Al Ain Mall, Al Ain',
    priority: 'express',
    status: 'assigned',
    createdAt: '2024-01-15T07:20:00Z',
    estimatedValue: 'AED 180',
    description: 'Business presentation materials',
    preferredTime: 'ASAP',
  },
  {
    id: 'INQ-2024-005',
    customerName: 'Laila Abdullah',
    phone: '+971-55-234-5678',
    email: 'laila.abdullah@home.ae',
    service: 'Inter-Emirate',
    pickup: 'MOE, Dubai',
    delivery: 'RAK Mall, Ras Al Khaimah',
    priority: 'normal',
    status: 'completed',
    createdAt: '2024-01-14T16:30:00Z',
    estimatedValue: 'AED 200',
    description: 'Gift packages for family',
    preferredTime: 'Flexible timing',
  },
];

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  urgent: 'bg-red-100 text-red-800',
  express: 'bg-purple-100 text-purple-800',
};

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-indigo-100 text-indigo-800',
  assigned: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface InquiryTableProps {
  onViewInquiry: (inquiry: Inquiry) => void;
  onContactCustomer: (inquiry: Inquiry) => void;
  onAcceptInquiry: (inquiry: Inquiry) => void;
  onDeclineInquiry: (inquiry: Inquiry) => void;
}

export function InquiryTable({
  onViewInquiry,
  onContactCustomer,
  onAcceptInquiry,
  onDeclineInquiry,
}: InquiryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<Inquiry>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-gray-600">
            {row.getValue('id')}
          </span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">
              {row.getValue('customerName')}
            </div>
            <div className="text-sm text-gray-500">
              {row.original.phone}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'service',
        header: 'Service',
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.getValue('service')}
          </span>
        ),
      },
      {
        accessorKey: 'pickup',
        header: 'Route',
        cell: ({ row }) => (
          <div className="max-w-xs">
            <div className="text-sm text-gray-900 truncate">
              From: {row.original.pickup}
            </div>
            <div className="text-sm text-gray-500 truncate">
              To: {row.original.delivery}
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
            {row.getValue('status')}
          </span>
        ),
      },
      {
        accessorKey: 'estimatedValue',
        header: 'Value',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            {row.getValue('estimatedValue')}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => {
          const date = new Date(row.getValue('createdAt'));
          return (
            <div className="text-sm text-gray-500">
              {date.toLocaleDateString()}
              <br />
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              onClick={() => onViewInquiry(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onContactCustomer(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Contact Customer"
            >
              <PhoneIcon className="h-4 w-4" />
            </button>
            {row.original.status === 'new' && (
              <>
                <button
                  onClick={() => onAcceptInquiry(row.original)}
                  className="p-1 text-green-400 hover:text-green-600"
                  title="Accept Inquiry"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeclineInquiry(row.original)}
                  className="p-1 text-red-400 hover:text-red-600"
                  title="Decline Inquiry"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    [onViewInquiry, onContactCustomer, onAcceptInquiry, onDeclineInquiry]
  );

  const table = useReactTable({
    data: mockInquiries,
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
              placeholder="Search inquiries..."
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
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="quoted">Quoted</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
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
            <option value="urgent">Urgent</option>
            <option value="express">Express</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {table.getFilteredRowModel().rows.length} of{' '}
          {table.getCoreRowModel().rows.length} inquiries
        </div>
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