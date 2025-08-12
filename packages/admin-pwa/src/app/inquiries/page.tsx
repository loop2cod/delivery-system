'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/providers/AdminProvider';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { InquiryTable } from '@/components/inquiries/InquiryTable';
import { InquiryModal } from '@/components/inquiries/InquiryModal';
import { InquiryCreateModal } from '@/components/inquiries/InquiryCreateModal';
import { adminAPI, Inquiry } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function InquiriesPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [stats, setStats] = useState({
    totalInquiries: 0,
    newInquiries: 0,
    pendingResponse: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadInquiries();
      loadDashboardStats();
    }
  }, [isAuthenticated, pagination.page, pagination.limit, filters]);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getInquiries({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status === 'all' ? '' : filters.status || undefined,
        search: filters.search || undefined,
      });
      setInquiries(response.inquiries);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load inquiries:', error);
      toast.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await adminAPI.getDashboard();
      setStats({
        totalInquiries: response.stats.totalInquiries,
        newInquiries: response.stats.newInquiries,
        pendingResponse: response.stats.totalInquiries - response.stats.newInquiries,
        conversionRate: response.stats.totalInquiries > 0 
          ? Math.round((response.stats.newInquiries / response.stats.totalInquiries) * 100)
          : 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleViewInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setIsModalOpen(true);
  };

  const handleContactCustomer = (inquiry: Inquiry) => {
    toast.success(`Initiating call to ${inquiry.contact_person}`);
    // Implement call functionality
    console.log('Contacting customer:', inquiry);
  };

  const handleAcceptInquiry = async (inquiry: Inquiry) => {
    try {
      await adminAPI.updateInquiry(inquiry.id, { status: 'APPROVED' });
      toast.success(`Inquiry ${inquiry.reference_number} approved`);
      setIsModalOpen(false);
      loadInquiries();
    } catch (error) {
      console.error('Failed to approve inquiry:', error);
      toast.error('Failed to approve inquiry');
    }
  };

  const handleDeclineInquiry = async (inquiry: Inquiry) => {
    try {
      await adminAPI.updateInquiry(inquiry.id, { status: 'REJECTED' });
      toast.success(`Inquiry ${inquiry.reference_number} rejected`);
      setIsModalOpen(false);
      loadInquiries();
    } catch (error) {
      console.error('Failed to reject inquiry:', error);
      toast.error('Failed to reject inquiry');
    }
  };

  const handleAssignDriver = async (inquiry: Inquiry) => {
    try {
      await adminAPI.updateInquiry(inquiry.id, { status: 'CONVERTED' });
      toast.success(`Inquiry ${inquiry.reference_number} converted to delivery`);
      setIsModalOpen(false);
      loadInquiries();
    } catch (error) {
      console.error('Failed to convert inquiry:', error);
      toast.error('Failed to convert inquiry');
    }
  };

  const handleUpdateInquiry = async (inquiry: Inquiry, updates: { status?: string; notes?: string }) => {
    try {
      await adminAPI.updateInquiry(inquiry.id, updates);
      const statusMessage = updates.status ? ` Status updated to ${updates.status.toLowerCase()}` : '';
      const notesMessage = updates.notes ? ` Notes added` : '';
      toast.success(`Inquiry ${inquiry.reference_number} updated.${statusMessage}${notesMessage}`);
      setIsModalOpen(false);
      loadInquiries();
    } catch (error) {
      console.error('Failed to update inquiry:', error);
      toast.error('Failed to update inquiry');
    }
  };

  const handleCreateInquiry = () => {
    setIsCreateModalOpen(true);
  };

  const handleInquiryCreated = () => {
    loadInquiries();
    loadDashboardStats();
  };

  const handleExportInquiries = () => {
    toast.success('Exporting inquiries to CSV');
    // TODO: Implement export functionality
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const statsDisplay = [
    { 
      name: 'Total Inquiries', 
      value: stats.totalInquiries.toString(), 
      change: '+12%', 
      changeType: 'increase' as const
    },
    { 
      name: 'New Today', 
      value: stats.newInquiries.toString(), 
      change: '+18%', 
      changeType: 'increase' as const
    },
    { 
      name: 'Pending Response', 
      value: stats.pendingResponse.toString(), 
      change: '-5%', 
      changeType: 'decrease' as const
    },
    { 
      name: 'Conversion Rate', 
      value: `${stats.conversionRate}%`, 
      change: '+2%', 
      changeType: 'increase' as const
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Customer Inquiries
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and respond to customer delivery requests
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleExportInquiries}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <Button
              onClick={handleCreateInquiry}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Inquiry
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statsDisplay.map((item) => (
            <Card key={item.name}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-sm font-medium text-muted-foreground truncate">
                      {item.name}
                    </div>
                  </div>
                </div>
                <div className="mt-1 flex items-baseline">
                  <div className="text-2xl font-semibold text-foreground">
                    {item.value}
                  </div>
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Inquiries Table */}
        <InquiryTable
          inquiries={inquiries}
          loading={loading}
          pagination={pagination}
          filters={filters}
          onViewInquiry={handleViewInquiry}
          onContactCustomer={handleContactCustomer}
          onAcceptInquiry={handleAcceptInquiry}
          onDeclineInquiry={handleDeclineInquiry}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
        />


        {/* Inquiry Modal */}
        <InquiryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          inquiry={selectedInquiry}
          onContactCustomer={handleContactCustomer}
          onAcceptInquiry={handleAcceptInquiry}
          onDeclineInquiry={handleDeclineInquiry}
          onAssignDriver={handleAssignDriver}
          onUpdateInquiry={handleUpdateInquiry}
        />

        {/* Create Inquiry Modal */}
        <InquiryCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onInquiryCreated={handleInquiryCreated}
        />
      </div>
    </AdminLayout>
  );
}