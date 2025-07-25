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
  MapPinIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  licensePlate: string;
  status: 'available' | 'on_delivery' | 'break' | 'offline';
  currentLocation: string;
  completedToday: number;
  totalDeliveries: number;
  rating: number;
  joinedDate: string;
  avatar?: string;
  currentDelivery?: {
    id: string;
    customer: string;
    destination: string;
    estimatedTime: string;
  };
}

const mockDrivers: Driver[] = [
  {
    id: 'DRV-001',
    name: 'Omar Hassan',
    phone: '+971-50-123-4567',
    email: 'omar.hassan@deliveryuae.com',
    vehicle: 'Honda Civic',
    licensePlate: 'DXB-A-12345',
    status: 'on_delivery',
    currentLocation: 'Business Bay',
    completedToday: 8,
    totalDeliveries: 1250,
    rating: 4.9,
    joinedDate: '2023-06-15',
    currentDelivery: {
      id: 'PKG-2024-001',
      customer: 'Sarah Johnson',
      destination: 'DIFC',
      estimatedTime: '15 min',
    },
  },
  {
    id: 'DRV-002',
    name: 'Ahmed Ali',
    phone: '+971-56-789-0123',
    email: 'ahmed.ali@deliveryuae.com',
    vehicle: 'Toyota Corolla',
    licensePlate: 'DXB-B-67890',
    status: 'available',
    currentLocation: 'Dubai Mall',
    completedToday: 12,
    totalDeliveries: 2100,
    rating: 4.8,
    joinedDate: '2023-01-20',
  },
  {
    id: 'DRV-003',
    name: 'Mohammed Al Rashid',
    phone: '+971-52-456-7890',
    email: 'mohammed.rashid@deliveryuae.com',
    vehicle: 'Nissan Altima',
    licensePlate: 'DXB-C-54321',
    status: 'on_delivery',
    currentLocation: 'Marina Mall',
    completedToday: 6,
    totalDeliveries: 890,
    rating: 4.7,
    joinedDate: '2023-09-10',
    currentDelivery: {
      id: 'PKG-2024-002',
      customer: 'Fatima Hassan',
      destination: 'Jumeirah',
      estimatedTime: '25 min',
    },
  },
  {
    id: 'DRV-004',
    name: 'Khalid Ibrahim',
    phone: '+971-50-987-6543',
    email: 'khalid.ibrahim@deliveryuae.com',
    vehicle: 'Hyundai Elantra',
    licensePlate: 'DXB-D-98765',
    status: 'break',
    currentLocation: 'Al Barsha',
    completedToday: 10,
    totalDeliveries: 1675,
    rating: 4.6,
    joinedDate: '2023-03-05',
  },
  {
    id: 'DRV-005',
    name: 'Ali Mohammed',
    phone: '+971-55-234-5678',
    email: 'ali.mohammed@deliveryuae.com',
    vehicle: 'KIA Cerato',
    licensePlate: 'DXB-E-13579',
    status: 'available',
    currentLocation: 'Deira City Centre',
    completedToday: 9,
    totalDeliveries: 1430,
    rating: 4.8,
    joinedDate: '2023-04-18',
  },
  {
    id: 'DRV-006',
    name: 'Hassan Abdullah',
    phone: '+971-50-345-6789',
    email: 'hassan.abdullah@deliveryuae.com',
    vehicle: 'Ford Focus',
    licensePlate: 'DXB-F-24680',
    status: 'offline',
    currentLocation: 'Offline',
    completedToday: 0,
    totalDeliveries: 756,
    rating: 4.5,
    joinedDate: '2023-11-02',
  },
];

const statusColors = {
  available: 'bg-green-100 text-green-800',
  on_delivery: 'bg-blue-100 text-blue-800',
  break: 'bg-yellow-100 text-yellow-800',
  offline: 'bg-gray-100 text-gray-800',
};

const statusIcons = {
  available: CheckCircleIcon,
  on_delivery: TruckIcon,
  break: ClockIcon,
  offline: ClockIcon,
};

interface DriverTableProps {
  onViewDriver: (driver: Driver) => void;
  onContactDriver: (driver: Driver) => void;
  onAssignDelivery: (driver: Driver) => void;
  onViewLocation: (driver: Driver) => void;
}

export function DriverTable({
  onViewDriver,
  onContactDriver,
  onAssignDelivery,
  onViewLocation,
}: DriverTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<Driver>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Driver',
        cell: ({ row }) => (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {row.original.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {row.getValue('name')}
              </div>
              <div className="text-sm text-gray-500 font-mono">
                {row.original.id}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Contact',
        cell: ({ row }) => (
          <div>
            <div className="text-sm text-gray-900">
              {row.getValue('phone')}
            </div>
            <div className="text-sm text-gray-500">
              {row.original.email}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'vehicle',
        header: 'Vehicle',
        cell: ({ row }) => (
          <div>
            <div className="text-sm text-gray-900">
              {row.getValue('vehicle')}
            </div>
            <div className="text-sm text-gray-500 font-mono">
              {row.original.licensePlate}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as keyof typeof statusColors;
          const StatusIcon = statusIcons[status];
          return (
            <span
              className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                statusColors[status]
              )}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.replace('_', ' ')}
            </span>
          );
        },
      },
      {
        accessorKey: 'currentLocation',
        header: 'Location',
        cell: ({ row }) => (
          <div className="flex items-center space-x-1">
            <MapPinIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-900">
              {row.getValue('currentLocation')}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'completedToday',
        header: 'Today',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            {row.getValue('completedToday')}
          </span>
        ),
      },
      {
        accessorKey: 'totalDeliveries',
        header: 'Total',
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.getValue('totalDeliveries')}
          </span>
        ),
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) => (
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-900">
              {row.getValue('rating')}
            </span>
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={clsx(
                    'h-4 w-4',
                    i < Math.floor(row.original.rating) ? 'fill-current' : 'text-gray-300'
                  )}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onViewDriver(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onContactDriver(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Contact Driver"
            >
              <PhoneIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewLocation(row.original)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="View Location"
            >
              <MapPinIcon className="h-4 w-4" />
            </button>
            {row.original.status === 'available' && (
              <button
                onClick={() => onAssignDelivery(row.original)}
                className="px-2 py-1 text-xs font-medium text-white bg-primary rounded hover:bg-primary/90"
                title="Assign Delivery"
              >
                Assign
              </button>
            )}
          </div>
        ),
      },
    ],
    [onViewDriver, onContactDriver, onAssignDelivery, onViewLocation]
  );

  const table = useReactTable({
    data: mockDrivers,
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
              placeholder="Search drivers..."
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
            <option value="available">Available</option>
            <option value="on_delivery">On Delivery</option>
            <option value="break">On Break</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {table.getFilteredRowModel().rows.length} of{' '}
          {table.getCoreRowModel().rows.length} drivers
        </div>
      </div>

      {/* Driver Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Available</p>
              <p className="text-lg font-semibold text-green-900">
                {mockDrivers.filter(d => d.status === 'available').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <TruckIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">On Delivery</p>
              <p className="text-lg font-semibold text-blue-900">
                {mockDrivers.filter(d => d.status === 'on_delivery').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">On Break</p>
              <p className="text-lg font-semibold text-yellow-900">
                {mockDrivers.filter(d => d.status === 'break').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-gray-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-800">Offline</p>
              <p className="text-lg font-semibold text-gray-900">
                {mockDrivers.filter(d => d.status === 'offline').length}
              </p>
            </div>
          </div>
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