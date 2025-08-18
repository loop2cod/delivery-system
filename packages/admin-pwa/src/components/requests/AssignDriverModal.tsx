'use client';

import { useState } from 'react';
import { 
  XMarkIcon,
  UserIcon,
  TruckIcon,
  StarIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { DeliveryRequest, Driver } from '@/lib/api';
import { formatDate } from '@/lib/api';

interface AssignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: DeliveryRequest | null;
  availableDrivers: Driver[];
  onAssign: (requestId: string, driverId: string, notes?: string) => void;
}

export function AssignDriverModal({ 
  isOpen, 
  onClose, 
  request, 
  availableDrivers, 
  onAssign 
}: AssignDriverModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [notes, setNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  if (!request) return null;

  const handleAssign = async () => {
    if (!selectedDriverId) return;
    
    setIsAssigning(true);
    try {
      await onAssign(request.id, selectedDriverId, notes || undefined);
      setSelectedDriverId('');
      setNotes('');
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    if (!isAssigning) {
      setSelectedDriverId('');
      setNotes('');
      onClose();
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'MOTORCYCLE':
        return '🏍️';
      case 'SEDAN':
        return '🚗';
      case 'VAN':
        return '🚐';
      case 'TRUCK':
        return '🚛';
      default:
        return '🚗';
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'BUSY':
        return 'bg-red-100 text-red-800';
      case 'OFFLINE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} size="xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Assign Driver
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Request #{request.requestNumber} • {request.company?.name}
          </p>
        </div>
        
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-500"
          disabled={isAssigning}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
        {/* Request Summary */}
        <Card className="p-4 mb-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Route:</span>
              <div className="mt-1">
                <div className="text-gray-600 truncate">
                  From: {request.pickupAddress}
                </div>
                <div className="text-gray-600 truncate">
                  To: {request.deliveryAddress}
                </div>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Schedule:</span>
              <div className="mt-1">
                <div className="text-gray-600">
                  {formatDate(request.pickupDate).date} at {request.pickupTime}
                </div>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Items:</span>
              <div className="mt-1">
                <div className="text-gray-600">
                  {request.items.length} item{request.items.length !== 1 ? 's' : ''} • {request.totalWeight}kg
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Available Drivers */}
        <div className="space-y-4 mb-6">
          <h3 className="font-medium text-gray-900">Available Drivers ({availableDrivers.length})</h3>
          
          {availableDrivers.length === 0 ? (
            <Card className="p-8 text-center">
              <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Drivers</h3>
              <p className="text-gray-600">
                All drivers are currently busy or offline. You may need to wait or assign manually.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {availableDrivers.map((driver) => {
                const isSelected = selectedDriverId === driver.id;
                const lastActive = formatDate(driver.last_active);
                
                return (
                  <Card 
                    key={driver.id}
                    className={`p-4 cursor-pointer border-2 transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDriverId(driver.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-gray-600" />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {driver.name}
                            </h4>
                            {isSelected && (
                              <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              {driver.phone}
                            </div>
                            <div className="flex items-center">
                              <TruckIcon className="h-4 w-4 mr-1" />
                              {getVehicleIcon(driver.vehicle_type)} {driver.vehicle_type}
                            </div>
                            <div className="flex items-center">
                              <span>{driver.vehicle_plate}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <div className="flex items-center">
                              <StarIcon className="h-4 w-4 mr-1 text-yellow-400 fill-current" />
                              {driver.rating.toFixed(1)}
                            </div>
                            <div>
                              {driver.completed_deliveries}/{driver.total_deliveries} completed
                            </div>
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              Active {lastActive.relative}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <Badge className={getAvailabilityColor(driver.availability_status)}>
                          {driver.availability_status}
                        </Badge>
                        
                        <Badge className="bg-gray-100 text-gray-800">
                          {driver.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Assignment Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assignment Notes (Optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any specific instructions for the driver..."
            rows={3}
            disabled={isAssigning}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {selectedDriverId && (
              <div className="flex items-center text-green-600">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Driver selected
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedDriverId || isAssigning || availableDrivers.length === 0}
              loading={isAssigning}
            >
              Assign Driver
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}