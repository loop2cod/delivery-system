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
  ChevronDown,
  ChevronUp,
  Eye,
  Phone,
  MapPin,
  Star,
  Search,
  Truck,
  User,
} from 'lucide-react';
import { Driver, formatDate } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DriversTableProps {
  drivers: Driver[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    status: string;
    availability: string;
    search: string;
  };
  onViewDriver: (driver: Driver) => void;
  onContactDriver: (driver: Driver) => void;
  onViewLocation: (driver: Driver) => void;
  onFilterChange: (key: string, value: string) => void;
  onPageChange: (page: number) => void;
}

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  ON_LEAVE: 'bg-yellow-100 text-yellow-800',
};

const AVAILABILITY_COLORS = {
  AVAILABLE: 'bg-green-100 text-green-800',
  BUSY: 'bg-orange-100 text-orange-800',
  OFFLINE: 'bg-gray-100 text-gray-800',
};

export function DriversTable({
  drivers,
  loading,
  pagination,
  filters,
  onViewDriver,
  onContactDriver,
  onViewLocation,
  onFilterChange,
  onPageChange,
}: DriversTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns = useMemo<ColumnDef<Driver>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Driver',
        cell: ({ row }) => (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900">
                {row.getValue('name')}
              </div>
              <div className="text-sm text-gray-500">
                {row.original.email}
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
            <div className="text-sm font-medium text-gray-900 flex items-center">
              <Phone className="h-3 w-3 mr-1" />
              {row.getValue('phone')}
            </div>
            <div className="text-sm text-gray-500">
              License: {row.original.license_number}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'vehicle_type',
        header: 'Vehicle',
        cell: ({ row }) => (
          <div className="flex items-center">
            <Truck className="h-4 w-4 mr-2 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {row.getValue('vehicle_type')}
              </div>
              <div className="text-sm text-gray-500">
                {row.original.vehicle_plate}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as keyof typeof STATUS_COLORS;
          return (
            <Badge variant="secondary" className={STATUS_COLORS[status]}>
              {status.replace('_', ' ')}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'availability_status',
        header: 'Availability',
        cell: ({ row }) => {
          const availability = row.getValue('availability_status') as keyof typeof AVAILABILITY_COLORS;
          return (
            <Badge variant="secondary" className={AVAILABILITY_COLORS[availability]}>
              {availability}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) => (
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 mr-1" />
            <span className="text-sm font-medium text-gray-900">
              {row.getValue('rating')}/5
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'total_deliveries',
        header: 'Deliveries',
        cell: ({ row }) => (
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {row.original.completed_deliveries}/{row.getValue('total_deliveries')}
            </div>
            <div className="text-xs text-gray-500">
              completed/total
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'joined_date',
        header: 'Joined',
        cell: ({ row }) => {
          const dateStr = row.getValue('joined_date') as string;
          const formatted = formatDate(dateStr);
          return (
            <div className="text-sm text-gray-500">
              {formatted.date}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDriver(row.original)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onContactDriver(row.original)}
            >
              <Phone className="h-4 w-4 mr-1" />
              Call
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewLocation(row.original)}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Location
            </Button>
          </div>
        ),
      },
    ],
    [onViewDriver, onContactDriver, onViewLocation]
  );

  const table = useReactTable({
    data: drivers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    manualPagination: true,
    pageCount: pagination.pages,
  });

  return (
    <Card>
      <CardContent className="p-0">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search drivers..."
                  value={filters.search}
                  onChange={(e) => onFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select
                value={filters.status}
                onValueChange={(value) => onFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-48">
              <Select
                value={filters.availability}
                onValueChange={(value) => onFilterChange('availability', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Availability" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">All Availability</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="BUSY">Busy</SelectItem>
                  <SelectItem value="OFFLINE">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-6 py-3">
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center space-x-1',
                            header.column.getCanSort() &&
                              'cursor-pointer select-none hover:text-gray-900'
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {header.column.getCanSort() && (
                            <div className="flex flex-col">
                              <ChevronUp
                                className={cn(
                                  'h-3 w-3',
                                  header.column.getIsSorted() === 'asc'
                                    ? 'text-gray-900'
                                    : 'text-gray-400'
                                )}
                              />
                              <ChevronDown
                                className={cn(
                                  'h-3 w-3 -mt-1',
                                  header.column.getIsSorted() === 'desc'
                                    ? 'text-gray-900'
                                    : 'text-gray-400'
                                )}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2 text-gray-500">Loading drivers...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="hover:bg-gray-50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-6 py-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex flex-col items-center">
                      <Truck className="h-12 w-12 text-gray-400 mb-4" />
                      <div className="text-lg font-medium text-gray-900 mb-2">
                        No drivers found
                      </div>
                      <div className="text-gray-500">
                        {filters.search || filters.status || filters.availability
                          ? 'Try adjusting your search or filter criteria.'
                          : 'No drivers have been added yet.'}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
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
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={pagination.page === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}