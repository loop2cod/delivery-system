'use client';

import { useState } from 'react';
import { 
  XMarkIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { DeliveryRequest } from '@/lib/api';
import { formatDate, getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel } from '@/lib/api';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: DeliveryRequest | null;
  onStatusUpdate: (requestId: string, status: DeliveryRequest['status'], notes?: string) => void;
}

const statusOptions: Array<{ value: DeliveryRequest['status']; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function RequestModal({ isOpen, onClose, request, onStatusUpdate }: RequestModalProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<DeliveryRequest['status'] | ''>('');
  const [notes, setNotes] = useState('');

  if (!request) return null;

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    
    setIsUpdatingStatus(true);
    try {
      await onStatusUpdate(request.id, newStatus, notes || undefined);
      setNewStatus('');
      setNotes('');
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const createdDate = formatDate(request.createdAt);
  const pickupDate = formatDate(request.pickupDate);
  const deliveryDate = formatDate(request.deliveryDate);

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Delivery Request Details
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Request #{request.requestNumber}
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center space-x-4">
            <Badge className={getStatusColor(request.status)} size="lg">
              {getStatusLabel(request.status)}
            </Badge>
            <Badge className={getPriorityColor(request.priority)} size="lg">
              {getPriorityLabel(request.priority)}
            </Badge>
            <span className="text-sm text-gray-500">
              Created {createdDate.relative}
            </span>
          </div>

          {/* Company Information */}
          {request.company && (
            <Card className="p-4">
              <div className="flex items-start space-x-3">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-400 mt-1" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Company Details</h3>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">{request.company.name}</span>
                      {request.company.industry && (
                        <span className="text-gray-500 ml-2">• {request.company.industry}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center">
                      <UserIcon className="h-4 w-4 mr-1" />
                      {request.company.contactPerson}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      {request.company.phone}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center">
                      <EnvelopeIcon className="h-4 w-4 mr-1" />
                      {request.company.email}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Route Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup */}
            <Card className="p-4">
              <div className="flex items-start space-x-3">
                <MapPinIcon className="h-6 w-6 text-green-500 mt-1" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Pickup Details</h3>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm">
                      <div className="font-medium">{request.pickupContactName}</div>
                      <div className="text-gray-600">{request.pickupPhone}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {request.pickupAddress}
                    </div>
                    {request.pickupInstructions && (
                      <div className="text-sm text-gray-500 italic">
                        Note: {request.pickupInstructions}
                      </div>
                    )}
                    <div className="text-sm text-gray-500 flex items-center mt-2">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {pickupDate.date}
                      <ClockIcon className="h-4 w-4 ml-3 mr-1" />
                      {request.pickupTime}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Delivery */}
            <Card className="p-4">
              <div className="flex items-start space-x-3">
                <MapPinIcon className="h-6 w-6 text-red-500 mt-1" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Delivery Details</h3>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm">
                      <div className="font-medium">{request.deliveryContactName}</div>
                      <div className="text-gray-600">{request.deliveryPhone}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {request.deliveryAddress}
                    </div>
                    {request.deliveryInstructions && (
                      <div className="text-sm text-gray-500 italic">
                        Note: {request.deliveryInstructions}
                      </div>
                    )}
                    <div className="text-sm text-gray-500 flex items-center mt-2">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {deliveryDate.date}
                      <ClockIcon className="h-4 w-4 ml-3 mr-1" />
                      {request.deliveryTime}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Items */}
          <Card className="p-4">
            <div className="flex items-start space-x-3">
              <TruckIcon className="h-6 w-6 text-gray-400 mt-1" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Items</h3>
                <div className="mt-2 space-y-2">
                  {request.items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.description}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Quantity: {item.quantity}
                            {item.weight && ` • Weight: ${item.weight}kg`}
                            {item.dimensions && ` • Dimensions: ${item.dimensions}`}
                            {item.value && ` • Value: AED ${item.value}`}
                          </div>
                          {item.fragile && (
                            <div className="flex items-center text-xs text-amber-600 mt-1">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              Fragile
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-sm font-medium text-gray-900 pt-2 border-t">
                    Total Weight: {request.totalWeight}kg
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Pricing */}
          <Card className="p-4">
            <div className="flex items-start space-x-3">
              <CurrencyDollarIcon className="h-6 w-6 text-gray-400 mt-1" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Pricing</h3>
                <div className="mt-2 space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">
                      AED {request.actualCost || request.estimatedCost || 0}
                    </span>
                    <span className="text-gray-500 ml-2">
                      ({request.actualCost ? 'Actual' : 'Estimated'})
                    </span>
                  </div>
                  {request.priceCalculation && (
                    <div className="text-xs text-gray-500">
                      Calculation details available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {request.specialRequirements && (
              <Card className="p-4">
                <h3 className="font-medium text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Special Requirements
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  {request.specialRequirements}
                </p>
              </Card>
            )}

            {request.internalReference && (
              <Card className="p-4">
                <h3 className="font-medium text-gray-900">Internal Reference</h3>
                <p className="text-sm text-gray-600 mt-2">
                  {request.internalReference}
                </p>
              </Card>
            )}
          </div>

          {/* Admin Notes */}
          {request.adminNotes && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <h3 className="font-medium text-gray-900">Admin Notes</h3>
              <p className="text-sm text-gray-700 mt-2">
                {request.adminNotes}
              </p>
            </Card>
          )}

          {/* Assignment Info */}
          {request.assignedDriverId && request.assignedAt && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h3 className="font-medium text-gray-900">Assignment Details</h3>
              <div className="text-sm text-gray-700 mt-2">
                <div>Driver ID: {request.assignedDriverId}</div>
                <div>Assigned: {formatDate(request.assignedAt).relative}</div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Status Update Section */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <h3 className="font-medium text-gray-900 mb-3">Update Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Status
            </label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as DeliveryRequest['status'])}
            >
              <option value="">Select status...</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this status update..."
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isUpdatingStatus}
          >
            Close
          </Button>
          <Button
            onClick={handleStatusUpdate}
            disabled={!newStatus || isUpdatingStatus}
            loading={isUpdatingStatus}
          >
            Update Status
          </Button>
        </div>
      </div>
    </Dialog>
  );
}