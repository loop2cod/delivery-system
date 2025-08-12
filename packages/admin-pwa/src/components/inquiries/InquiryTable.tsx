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
  Check,
  X,
  Search,
} from 'lucide-react';
import { Inquiry, getStatusColor, getStatusLabel, formatDate } from '@/lib/api';
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

interface InquiryTableProps {
  inquiries: Inquiry[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    status: string;
    search: string;
  };
  onViewInquiry: (inquiry: Inquiry) => void;
  onContactCustomer: (inquiry: Inquiry) => void;
  onAcceptInquiry: (inquiry: Inquiry) => void;
  onDeclineInquiry: (inquiry: Inquiry) => void;
  onFilterChange: (key: string, value: string) => void;
  onPageChange: (page: number) => void;
}

export function InquiryTable({
  inquiries,
  loading,
  pagination,
  filters,
  onViewInquiry,
  onContactCustomer,
  onAcceptInquiry,
  onDeclineInquiry,
  onFilterChange,
  onPageChange,
}: InquiryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Inquiry>[]>(
    () => [
      {
        accessorKey: 'reference_number',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-gray-600">
            {row.getValue('reference_number')}
          </span>
        ),
      },
      {
        accessorKey: 'company_name',
        header: 'Company',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">
              {row.getValue('company_name')}
            </div>
            <div className="text-sm text-gray-500">
              {row.original.contact_person}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'industry',
        header: 'Industry',
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.getValue('industry')}
          </span>
        ),
      },
      {
        accessorKey: 'expected_volume',
        header: 'Expected Volume',
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.getValue('expected_volume')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          return (
            <Badge variant="secondary" className={getStatusColor(status)}>
              {getStatusLabel(status)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => {
          const dateStr = row.getValue('created_at') as string;
          const formatted = formatDate(dateStr);
          return (
            <div className="text-sm text-gray-500">
              {formatted.date}
              <br />
              {formatted.time}
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
              variant="ghost"
              size="sm"
              onClick={() => onViewInquiry(row.original)}
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onContactCustomer(row.original)}
              title="Contact Customer"
            >
              <Phone className="h-4 w-4" />
            </Button>
            {row.original.status === 'NEW' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAcceptInquiry(row.original)}
                  className="text-green-600 hover:text-green-700"
                  title="Approve Inquiry"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeclineInquiry(row.original)}
                  className="text-red-600 hover:text-red-700"
                  title="Reject Inquiry"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [onViewInquiry, onContactCustomer, onAcceptInquiry, onDeclineInquiry]
  );

  const table = useReactTable({
    data: inquiries,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true,
    pageCount: pagination.pages,
    state: {
      sorting,
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.limit,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="pl-10"
              placeholder="Search inquiries..."
            />
          </div>
          
          <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {pagination.total} total inquiries
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-left"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
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
                              asc: <ChevronUp className="h-4 w-4" />,
                              desc: <ChevronDown className="h-4 w-4" />,
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
                      <TableCell
                        key={cell.id}
                        className="text-sm"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  disabled={pagination.page === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.pages)}
                  disabled={pagination.page === pagination.pages}
                >
                  Last
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({pagination.total} total)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}