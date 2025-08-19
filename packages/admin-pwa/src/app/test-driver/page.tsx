'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/providers/AdminProvider';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { adminAPI, Driver } from '@/lib/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TruckIcon, UserPlusIcon, KeyIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export default function TestDriverPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [testRequestId, setTestRequestId] = useState('');
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Test driver data
  const [testDriverData, setTestDriverData] = useState({
    name: 'Ahmed Al-Rashid',
    email: 'ahmed.driver@uaedelivery.com',
    phone: '+971501234567',
    license_number: 'DL123456789',
    license_expiry: '2025-12-31',
    vehicle_type: 'VAN' as const,
    vehicle_plate: 'A 12345',
    emergency_contact: {
      name: 'Fatima Al-Rashid',
      phone: '+971509876543',
      relationship: 'Spouse'
    }
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
  }, [isAuthenticated]);

  const loadDrivers = async () => {
    try {
      const response = await adminAPI.getDrivers({ limit: 50 });
      setDrivers(response.drivers);
    } catch (error) {
      console.error('Failed to load drivers:', error);
      toast.error('Failed to load drivers');
    }
  };

  const handleCreateTestDriver = async () => {
    setIsCreatingDriver(true);
    try {
      const newDriver = await adminAPI.createDriver(testDriverData);
      toast.success(`Driver created successfully! ID: ${newDriver.id}`);
      await loadDrivers();
      setSelectedDriver(newDriver.id);
    } catch (error: any) {
      console.error('Failed to create driver:', error);
      toast.error(error.message || 'Failed to create driver');
    } finally {
      setIsCreatingDriver(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedDriver) {
      toast.error('Please select a driver first');
      return;
    }

    setIsResetting(true);
    try {
      const response = await adminAPI.resetDriverPassword(selectedDriver);
      toast.success(`Password reset! New password: ${response.newPassword}`);
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const handleAssignRequest = async () => {
    if (!selectedDriver || !testRequestId) {
      toast.error('Please select a driver and enter a request ID');
      return;
    }

    setIsAssigning(true);
    try {
      const response = await adminAPI.assignRequestToDriver(selectedDriver, testRequestId);
      toast.success('Request assigned successfully!');
    } catch (error: any) {
      console.error('Failed to assign request:', error);
      toast.error(error.message || 'Failed to assign request');
    } finally {
      setIsAssigning(false);
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Driver System Test
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Test driver creation, login, and request assignment functionality
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Test Driver */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Create Test Driver
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={testDriverData.name}
                    onChange={(e) => setTestDriverData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={testDriverData.email}
                    onChange={(e) => setTestDriverData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={testDriverData.phone}
                    onChange={(e) => setTestDriverData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>License Number</Label>
                  <Input
                    value={testDriverData.license_number}
                    onChange={(e) => setTestDriverData(prev => ({ ...prev, license_number: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Vehicle Type</Label>
                  <Select
                    value={testDriverData.vehicle_type}
                    onValueChange={(value: any) => setTestDriverData(prev => ({ ...prev, vehicle_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MOTORCYCLE">Motorcycle</SelectItem>
                      <SelectItem value="SEDAN">Sedan</SelectItem>
                      <SelectItem value="VAN">Van</SelectItem>
                      <SelectItem value="TRUCK">Truck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vehicle Plate</Label>
                  <Input
                    value={testDriverData.vehicle_plate}
                    onChange={(e) => setTestDriverData(prev => ({ ...prev, vehicle_plate: e.target.value }))}
                  />
                </div>
              </div>

              <Button 
                onClick={handleCreateTestDriver} 
                disabled={isCreatingDriver}
                className="w-full"
              >
                {isCreatingDriver ? 'Creating...' : 'Create Test Driver'}
              </Button>
            </CardContent>
          </Card>

          {/* Driver Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TruckIcon className="h-5 w-5 mr-2" />
                Driver Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Driver</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name} ({driver.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleResetPassword} 
                disabled={isResetting || !selectedDriver}
                variant="outline"
                className="w-full"
              >
                <KeyIcon className="h-4 w-4 mr-2" />
                {isResetting ? 'Resetting...' : 'Reset Driver Password'}
              </Button>

              <div>
                <Label>Test Request ID</Label>
                <Input
                  value={testRequestId}
                  onChange={(e) => setTestRequestId(e.target.value)}
                  placeholder="Enter delivery request ID"
                />
              </div>

              <Button 
                onClick={handleAssignRequest} 
                disabled={isAssigning || !selectedDriver || !testRequestId}
                className="w-full"
              >
                <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                {isAssigning ? 'Assigning...' : 'Assign Request to Driver'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">1. Create a Test Driver</h4>
                <p className="text-sm text-gray-600">
                  Click "Create Test Driver" to create a new driver account. The system will generate a temporary password.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">2. Reset Driver Password</h4>
                <p className="text-sm text-gray-600">
                  Select a driver and click "Reset Driver Password" to generate a new temporary password for testing login.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">3. Test Driver Login</h4>
                <p className="text-sm text-gray-600">
                  Go to the driver app at <code className="bg-gray-100 px-1 rounded">http://localhost:3004</code> and login with the driver's email and the generated password.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">4. Assign Delivery Request</h4>
                <p className="text-sm text-gray-600">
                  Create a delivery request first, then use its ID to assign it to a driver. The driver will see it in their app.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Drivers */}
        {drivers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Current Drivers ({drivers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-gray-600">{driver.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{driver.status}</p>
                      <p className="text-xs text-gray-500">{driver.vehicle_type} - {driver.vehicle_plate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}