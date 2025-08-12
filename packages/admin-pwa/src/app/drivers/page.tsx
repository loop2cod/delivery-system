'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/providers/AdminProvider';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DriversTable } from '@/components/drivers/DriversTable';
import { DriverModal } from '@/components/drivers/DriverModal';
import { DriverCreateModal } from '@/components/drivers/DriverCreateModal';
import { adminAPI, Driver } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Download,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function DriversPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    status: '',
    availability: '',
    search: '',
  });
  const [stats, setStats] = useState({
    totalDrivers: 0,
    activeDrivers: 0,
    availableDrivers: 0,
    busyDrivers: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDrivers();
    }
  }, [isAuthenticated, pagination.page, pagination.limit, filters]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDrivers({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status === 'all' ? '' : filters.status || undefined,
        availability: filters.availability === 'all' ? '' : filters.availability || undefined,
        search: filters.search || undefined,
      });
      
      setDrivers(response.drivers);
      setPagination(response.pagination);
      
      // Calculate stats from the drivers data
      const activeCount = response.drivers.filter(d => d.status === 'ACTIVE').length;
      const availableCount = response.drivers.filter(d => d.availability_status === 'AVAILABLE').length;
      const busyCount = response.drivers.filter(d => d.availability_status === 'BUSY').length;
      
      setStats({
        totalDrivers: response.pagination.total,
        activeDrivers: activeCount,
        availableDrivers: availableCount,
        busyDrivers: busyCount,
      });
    } catch (error) {
      console.error('Failed to load drivers:', error);
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
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

  const handleViewDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsModalOpen(true);
  };

  const handleContactDriver = (driver: Driver) => {
    toast.success(`Initiating call to ${driver.name}`);
    console.log('Contacting driver:', driver);
  };

  const handleUpdateDriverStatus = async (driver: Driver, status: Driver['status']) => {
    try {
      await adminAPI.updateDriverStatus(driver.id, status);
      toast.success(`Driver ${driver.name} status updated to ${status.toLowerCase()}`);
      setIsModalOpen(false);
      loadDrivers();
    } catch (error) {
      console.error('Failed to update driver status:', error);
      toast.error('Failed to update driver status');
    }
  };

  const handleUpdateDriverAvailability = async (driver: Driver, availability: Driver['availability_status']) => {
    try {
      await adminAPI.updateDriverAvailability(driver.id, availability);
      toast.success(`Driver ${driver.name} availability updated to ${availability.toLowerCase()}`);
      setIsModalOpen(false);
      loadDrivers();
    } catch (error) {
      console.error('Failed to update driver availability:', error);
      toast.error('Failed to update driver availability');
    }
  };

  const handleViewLocation = (driver: Driver) => {
    toast.success(`Opening map for ${driver.name}'s location`);
    console.log('Viewing location for driver:', driver);
  };

  const handleCreateDriver = () => {
    setIsCreateModalOpen(true);
  };

  const handleDriverCreated = () => {
    loadDrivers();
  };

  const handleExportDrivers = () => {
    toast.success('Exporting drivers to CSV');
  };

  const handleViewMap = () => {
    toast.success('Opening driver location map');
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const statsDisplay = [
    { 
      name: 'Total Drivers', 
      value: stats.totalDrivers.toString(), 
      icon: Users,
      change: '+8%', 
      changeType: 'increase' as const
    },
    { 
      name: 'Active Drivers', 
      value: stats.activeDrivers.toString(), 
      icon: UserCheck,
      change: '+12%', 
      changeType: 'increase' as const
    },
    { 
      name: 'Available Now', 
      value: stats.availableDrivers.toString(), 
      icon: TrendingUp,
      change: '+5%', 
      changeType: 'increase' as const
    },
    { 
      name: 'Currently Busy', 
      value: stats.busyDrivers.toString(), 
      icon: UserX,
      change: '-3%', 
      changeType: 'decrease' as const
    },
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
              Manage delivery drivers and their availability
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleViewMap}>
              <MapPin className="h-4 w-4 mr-2" />
              Map View
            </Button>
            
            <Button variant="outline" onClick={handleExportDrivers}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <Button onClick={handleCreateDriver}>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
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
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-muted-foreground truncate">
                        {item.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-foreground">
                          {item.value}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Drivers Table */}
        <DriversTable
          drivers={drivers}
          loading={loading}
          pagination={pagination}
          filters={filters}
          onViewDriver={handleViewDriver}
          onContactDriver={handleContactDriver}
          onViewLocation={handleViewLocation}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
        />

        {/* Driver Modal */}
        <DriverModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          driver={selectedDriver}
          onContactDriver={handleContactDriver}
          onUpdateStatus={handleUpdateDriverStatus}
          onUpdateAvailability={handleUpdateDriverAvailability}
          onViewLocation={handleViewLocation}
        />

        {/* Create Driver Modal */}
        <DriverCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onDriverCreated={handleDriverCreated}
        />
      </div>
    </AdminLayout>
  );
}