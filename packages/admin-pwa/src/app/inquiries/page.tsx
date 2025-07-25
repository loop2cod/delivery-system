'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/providers/AdminProvider';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { InquiryTable } from '@/components/inquiries/InquiryTable';
import { InquiryModal } from '@/components/inquiries/InquiryModal';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

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

export default function InquiriesPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

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
    toast.success(`Initiating call to ${inquiry.customerName}`);
    // Implement call functionality
    console.log('Contacting customer:', inquiry);
  };

  const handleAcceptInquiry = (inquiry: Inquiry) => {
    toast.success(`Inquiry ${inquiry.id} accepted`);
    // Implement accept functionality
    console.log('Accepting inquiry:', inquiry);
    setIsModalOpen(false);
  };

  const handleDeclineInquiry = (inquiry: Inquiry) => {
    toast.error(`Inquiry ${inquiry.id} declined`);
    // Implement decline functionality
    console.log('Declining inquiry:', inquiry);
    setIsModalOpen(false);
  };

  const handleAssignDriver = (inquiry: Inquiry) => {
    toast.success(`Driver assignment initiated for ${inquiry.id}`);
    // Implement driver assignment
    console.log('Assigning driver to inquiry:', inquiry);
    setIsModalOpen(false);
  };

  const handleCreateInquiry = () => {
    toast.success('Create inquiry functionality coming soon');
    // Implement create inquiry modal
  };

  const handleExportInquiries = () => {
    toast.success('Exporting inquiries to CSV');
    // Implement export functionality
  };

  const stats = [
    { name: 'Total Inquiries', value: '127', change: '+12%', changeType: 'increase' },
    { name: 'New Today', value: '24', change: '+18%', changeType: 'increase' },
    { name: 'Pending Response', value: '8', change: '-5%', changeType: 'decrease' },
    { name: 'Conversion Rate', value: '84%', change: '+2%', changeType: 'increase' },
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
            <button
              onClick={handleExportInquiries}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
            
            <button
              onClick={handleCreateInquiry}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Inquiry
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.name}
              className="bg-white overflow-hidden shadow-sm rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </div>
                  </div>
                </div>
                <div className="mt-1 flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {item.value}
                  </div>
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Inquiries Table */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <InquiryTable
              onViewInquiry={handleViewInquiry}
              onContactCustomer={handleContactCustomer}
              onAcceptInquiry={handleAcceptInquiry}
              onDeclineInquiry={handleDeclineInquiry}
            />
          </div>
        </div>

        {/* Inquiry Modal */}
        <InquiryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          inquiry={selectedInquiry}
          onContactCustomer={handleContactCustomer}
          onAcceptInquiry={handleAcceptInquiry}
          onDeclineInquiry={handleDeclineInquiry}
          onAssignDriver={handleAssignDriver}
        />
      </div>
    </AdminLayout>
  );
}