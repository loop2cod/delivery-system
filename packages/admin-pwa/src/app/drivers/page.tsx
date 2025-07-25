'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/providers/AdminProvider';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DriverTable } from '@/components/drivers/DriverTable';
import { DriverModal } from '@/components/drivers/DriverModal';
import { AssignmentModal } from '@/components/drivers/AssignmentModal';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  ArrowDownTrayIcon,
  MapIcon,
} from '@heroicons/react/24/outline';

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

export default function DriversPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [driverForAssignment, setDriverForAssignment] = useState<Driver | undefined>(undefined);

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

  const handleViewDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDriverModalOpen(true);
  };

  const handleContactDriver = (driver: Driver) => {
    toast.success(`Initiating call to ${driver.name}`);
    // Implement call functionality
    console.log('Contacting driver:', driver);
  };

  const handleAssignDelivery = (driver: Driver) => {
    setDriverForAssignment(driver);
    setIsAssignmentModalOpen(true);
  };

  const handleViewLocation = (driver: Driver) => {
    toast.success(`Opening map for ${driver.name}'s location`);
    // Implement map/location viewing
    console.log('Viewing location for driver:', driver);
  };

  const handleUpdateStatus = (driver: Driver, status: string) => {
    toast.success(`Updated ${driver.name}'s status to ${status}`);
    // Implement status update
    console.log('Updating driver status:', { driver, status });
    setIsDriverModalOpen(false);
  };

  const handleAssignmentComplete = (driverId: string, inquiryId: string) => {
    toast.success(`Delivery assigned successfully!`);
    // Implement assignment logic
    console.log('Assigning delivery:', { driverId, inquiryId });
    setIsAssignmentModalOpen(false);
    setDriverForAssignment(undefined);
  };

  const handleAddDriver = () => {
    toast.success('Add driver functionality coming soon');
    // Implement add driver modal
  };

  const handleExportDrivers = () => {
    toast.success('Exporting driver data to CSV');
    // Implement export functionality
  };

  const handleViewMap = () => {
    toast.success('Opening driver location map');
    // Implement map view
  };

  const stats = [
    { name: 'Total Drivers', value: '24', change: '+2', changeType: 'increase' },
    { name: 'Available Now', value: '18', change: '+5', changeType: 'increase' },
    { name: 'On Delivery', value: '4', change: '-1', changeType: 'decrease' },
    { name: 'Average Rating', value: '4.7', change: '+0.1', changeType: 'increase' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Driver Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage delivery drivers, assignments, and performance
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleViewMap}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <MapIcon className="h-4 w-4 mr-2" />
              Map View
            </button>
            
            <button
              onClick={handleExportDrivers}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
            
            <button
              onClick={() => setIsAssignmentModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              Assign Delivery
            </button>
            
            <button
              onClick={handleAddDriver}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Driver
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

        {/* Drivers Table */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <DriverTable
              onViewDriver={handleViewDriver}
              onContactDriver={handleContactDriver}
              onAssignDelivery={handleAssignDelivery}
              onViewLocation={handleViewLocation}
            />
          </div>
        </div>

        {/* Driver Detail Modal */}
        <DriverModal
          isOpen={isDriverModalOpen}
          onClose={() => setIsDriverModalOpen(false)}
          driver={selectedDriver}
          onContactDriver={handleContactDriver}
          onAssignDelivery={handleAssignDelivery}
          onViewLocation={handleViewLocation}
          onUpdateStatus={handleUpdateStatus}
        />

        {/* Assignment Modal */}
        <AssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => {
            setIsAssignmentModalOpen(false);
            setDriverForAssignment(undefined);
          }}
          selectedDriver={driverForAssignment}
          onAssignDelivery={handleAssignmentComplete}
        />
      </div>
    </AdminLayout>
  );
}