'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/providers/AdminProvider';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardDocumentListIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function TestRequestsPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  // Test request data
  const [requestData, setRequestData] = useState({
    // Pickup details
    pickupContactName: 'John Smith',
    pickupPhone: '+971501234567',
    pickupAddress: 'Dubai Mall, Downtown Dubai, Dubai',
    pickupInstructions: 'Call when you arrive at the main entrance',
    
    // Delivery details
    deliveryContactName: 'Sarah Johnson',
    deliveryPhone: '+971509876543',
    deliveryAddress: 'Business Bay Tower, Business Bay, Dubai',
    deliveryInstructions: 'Office 1205, 12th floor',
    
    // Package details
    packageDescription: 'Important documents',
    packageWeight: 0.5,
    packageDimensions: '30x20x5 cm',
    packageValue: 100,
    
    // Request details
    priority: 'normal' as const,
    specialInstructions: 'Handle with care - contains sensitive documents'
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleCreateTestRequest = async () => {
    setIsCreating(true);
    try {
      // Create a mock delivery request
      const mockRequest = {
        companyId: '507f1f77bcf86cd799439011', // Mock company ID
        userId: '507f1f77bcf86cd799439012', // Mock user ID
        priority: requestData.priority,
        
        // Pickup details
        pickupContactName: requestData.pickupContactName,
        pickupPhone: requestData.pickupPhone,
        pickupAddress: requestData.pickupAddress,
        pickupInstructions: requestData.pickupInstructions,
        
        // Delivery details
        deliveryContactName: requestData.deliveryContactName,
        deliveryPhone: requestData.deliveryPhone,
        deliveryAddress: requestData.deliveryAddress,
        deliveryInstructions: requestData.deliveryInstructions,
        
        // Package details
        packageDescription: requestData.packageDescription,
        packageWeight: requestData.packageWeight,
        packageDimensions: requestData.packageDimensions,
        packageValue: requestData.packageValue,
        
        specialInstructions: requestData.specialInstructions
      };

      // Since we don't have a direct create request endpoint in admin API,
      // we'll simulate creating one by calling the backend directly
      const response = await fetch('/api/admin/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(mockRequest)
      });

      if (!response.ok) {
        throw new Error('Failed to create request');
      }

      const result = await response.json();
      toast.success(`Request created successfully! ID: ${result.id || 'Generated'}`);
      
      // Reset form
      setRequestData(prev => ({
        ...prev,
        pickupContactName: 'John Smith',
        deliveryContactName: 'Sarah Johnson',
        packageDescription: 'Important documents'
      }));
      
    } catch (error: any) {
      console.error('Failed to create request:', error);
      toast.error(error.message || 'Failed to create request');
    } finally {
      setIsCreating(false);
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
              Test Delivery Requests
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create test delivery requests for driver assignment testing
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pickup Details */}
          <Card>
            <CardHeader>
              <CardTitle>Pickup Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={requestData.pickupContactName}
                  onChange={(e) => setRequestData(prev => ({ ...prev, pickupContactName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={requestData.pickupPhone}
                  onChange={(e) => setRequestData(prev => ({ ...prev, pickupPhone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={requestData.pickupAddress}
                  onChange={(e) => setRequestData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <Label>Instructions</Label>
                <Textarea
                  value={requestData.pickupInstructions}
                  onChange={(e) => setRequestData(prev => ({ ...prev, pickupInstructions: e.target.value }))}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Details */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={requestData.deliveryContactName}
                  onChange={(e) => setRequestData(prev => ({ ...prev, deliveryContactName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={requestData.deliveryPhone}
                  onChange={(e) => setRequestData(prev => ({ ...prev, deliveryPhone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={requestData.deliveryAddress}
                  onChange={(e) => setRequestData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <Label>Instructions</Label>
                <Textarea
                  value={requestData.deliveryInstructions}
                  onChange={(e) => setRequestData(prev => ({ ...prev, deliveryInstructions: e.target.value }))}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Package Details */}
          <Card>
            <CardHeader>
              <CardTitle>Package Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Description</Label>
                <Input
                  value={requestData.packageDescription}
                  onChange={(e) => setRequestData(prev => ({ ...prev, packageDescription: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={requestData.packageWeight}
                    onChange={(e) => setRequestData(prev => ({ ...prev, packageWeight: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Value (AED)</Label>
                  <Input
                    type="number"
                    value={requestData.packageValue}
                    onChange={(e) => setRequestData(prev => ({ ...prev, packageValue: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div>
                <Label>Dimensions</Label>
                <Input
                  value={requestData.packageDimensions}
                  onChange={(e) => setRequestData(prev => ({ ...prev, packageDimensions: e.target.value }))}
                  placeholder="L x W x H cm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Request Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Request Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Priority</Label>
                <Select
                  value={requestData.priority}
                  onValueChange={(value: any) => setRequestData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Special Instructions</Label>
                <Textarea
                  value={requestData.specialInstructions}
                  onChange={(e) => setRequestData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleCreateTestRequest} 
                disabled={isCreating}
                className="w-full"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {isCreating ? 'Creating...' : 'Create Test Request'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">1. Create Test Request</h4>
                <p className="text-sm text-gray-600">
                  Fill in the form above and click "Create Test Request" to generate a delivery request.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">2. Assign to Driver</h4>
                <p className="text-sm text-gray-600">
                  Go to the <a href="/test-driver" className="text-blue-600 hover:underline">Driver Test page</a> to assign the request to a driver.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">3. Test Driver App</h4>
                <p className="text-sm text-gray-600">
                  Login to the driver app at <code className="bg-gray-100 px-1 rounded">http://localhost:3004</code> to see and manage the assigned request.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}