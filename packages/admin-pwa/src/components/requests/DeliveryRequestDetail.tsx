'use client';

import { useState } from 'react';
import { 
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  TruckIcon,
  UserIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ScaleIcon,
  CubeIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RejectRequestModal } from './RejectRequestModal';
import { DeliveryRequest } from '@/lib/api';
import { formatDate, getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel } from '@/lib/api';

interface DeliveryRequestDetailProps {
  request: DeliveryRequest;
  updating: boolean;
  onStatusUpdate: (status: DeliveryRequest['status'], notes?: string) => void;
  onAssignDriver: () => void;
  onRejectRequest: (reason: string) => void;
}

export function DeliveryRequestDetail({
  request,
  updating,
  onStatusUpdate,
  onAssignDriver,
  onRejectRequest
}: DeliveryRequestDetailProps) {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const dateInfo = formatDate(request.createdAt);
  const pickupDateInfo = formatDate(request.pickupDate);

  const handleRejectSubmit = (reason: string) => {
    onRejectRequest(reason);
    setIsRejectModalOpen(false);
  };

  const getStatusActions = () => {
    const actions = [];

    // Assign driver action (for pending requests)
    if (request.status === 'PENDING') {
      actions.push(
        <Button
          key="assign"
          onClick={onAssignDriver}
          disabled={updating}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <TruckIcon className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Assign Driver</span>
          <span className="sm:hidden">Assign</span>
        </Button>
      );
    }

    // Status progression actions
    if (request.status === 'PENDING' || request.status === 'ASSIGNED') {
      actions.push(
        <Button
          key="picked-up"
          variant="outline"
          onClick={() => onStatusUpdate('PICKED_UP')}
          disabled={updating}
          className="border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Mark Picked Up</span>
          <span className="sm:hidden">Picked Up</span>
        </Button>
      );
    }

    if (request.status === 'PICKED_UP') {
      actions.push(
        <Button
          key="in-transit"
          variant="outline"
          onClick={() => onStatusUpdate('IN_TRANSIT')}
          disabled={updating}
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          <TruckIcon className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">In Transit</span>
          <span className="sm:hidden">Transit</span>
        </Button>
      );
    }

    if (request.status === 'IN_TRANSIT' || request.status === 'PICKED_UP') {
      actions.push(
        <Button
          key="delivered"
          variant="outline"
          onClick={() => onStatusUpdate('DELIVERED')}
          disabled={updating}
          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
        >
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Mark Delivered</span>
          <span className="sm:hidden">Delivered</span>
        </Button>
      );
    }

    // Reject action (for non-cancelled and non-delivered requests)
    if (!['CANCELLED', 'DELIVERED'].includes(request.status)) {
      actions.push(
        <Button
          key="reject"
          variant="outline"
          onClick={() => setIsRejectModalOpen(true)}
          disabled={updating}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Reject Request</span>
          <span className="sm:hidden">Reject</span>
        </Button>
      );
    }

    return actions;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Status Header Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            {/* Status Information */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-3">
                <Badge className={`${getStatusColor(request.status)} text-sm px-3 py-1.5 font-medium`}>
                  {getStatusLabel(request.status)}
                </Badge>
                <Badge className={`${getPriorityColor(request.priority)} text-sm px-3 py-1.5 font-medium`}>
                  {getPriorityLabel(request.priority)}
                </Badge>
              </div>
              
              {request.assignedDriverId && (
                <div className="flex items-center text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg border">
                  <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Driver ID: </span>
                  <span className="font-medium ml-1">{request.assignedDriverId}</span>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {getStatusActions()}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Request & Company Info */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Request Information */}
          <Card className="h-fit">
            <div className="p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Request Details</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Request Number</label>
                  <p className="text-sm font-mono text-gray-900 mt-1">{request.requestNumber}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</label>
                    <p className="text-sm text-gray-900 mt-1">{dateInfo.date}</p>
                    <p className="text-xs text-gray-500">{dateInfo.time}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Items</label>
                    <p className="text-sm text-gray-900 mt-1 flex items-center">
                      <CubeIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {request.items.length} item{request.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Weight</label>
                    <p className="text-sm text-gray-900 mt-1 flex items-center">
                      <ScaleIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {request.totalWeight} kg
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Est. Cost</label>
                    <p className="text-sm text-gray-900 mt-1 flex items-center">
                      <CurrencyDollarIcon className="h-4 w-4 mr-1 text-gray-400" />
                      AED {request.estimatedCost || 0}
                    </p>
                  </div>
                </div>

                {request.actualCost && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <label className="text-xs font-medium text-green-700 uppercase tracking-wide">Actual Cost</label>
                    <p className="text-sm text-green-900 mt-1 flex items-center">
                      <CurrencyDollarIcon className="h-4 w-4 mr-1 text-green-600" />
                      AED {request.actualCost}
                    </p>
                  </div>
                )}

                {request.specialRequirements && (
                  <div className="pt-3 border-t">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Special Requirements</label>
                    <p className="text-sm text-gray-900 mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">{request.specialRequirements}</p>
                  </div>
                )}

                {request.internalReference && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Internal Reference</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{request.internalReference}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Company Information */}
          <Card className="h-fit">
            <div className="p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <BuildingOfficeIcon className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Company Info</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Name</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{request.company?.name || 'Unknown Company'}</p>
                </div>
                
                {request.company?.contactPerson && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact Person</label>
                    <p className="text-sm text-gray-900 mt-1">{request.company.contactPerson}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  {request.company?.email && (
                    <div className="flex items-center text-sm text-gray-900">
                      <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {request.company.email}
                    </div>
                  )}
                  
                  {request.company?.phone && (
                    <div className="flex items-center text-sm text-gray-900">
                      <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                      {request.company.phone}
                    </div>
                  )}
                </div>

                {request.company?.industry && (
                  <div className="pt-3 border-t">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Industry</label>
                    <p className="text-sm text-gray-900 mt-1">{request.company.industry}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Schedule, Route & Items */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Schedule & Route */}
          <Card>
            <div className="p-4 sm:p-6">
              <div className="flex items-center mb-6">
                <CalendarIcon className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Schedule & Route</h3>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Schedule Section */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                    Schedule
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <div className="flex items-center text-sm mb-1">
                        <CalendarIcon className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="font-medium text-blue-900">Pickup Date</span>
                      </div>
                      <p className="text-sm text-blue-800 ml-6">{pickupDateInfo.date}</p>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                      <div className="flex items-center text-sm mb-1">
                        <ClockIcon className="h-4 w-4 mr-2 text-indigo-600" />
                        <span className="font-medium text-indigo-900">Pickup Time</span>
                      </div>
                      <p className="text-sm text-indigo-800 ml-6">{request.pickupTime || 'Not specified'}</p>
                    </div>

                    {request.deliveryTime && (
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                        <div className="flex items-center text-sm mb-1">
                          <ClockIcon className="h-4 w-4 mr-2 text-purple-600" />
                          <span className="font-medium text-purple-900">Delivery Time</span>
                        </div>
                        <p className="text-sm text-purple-800 ml-6">{request.deliveryTime}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Route Section */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                    Route
                  </h4>
                  <div className="space-y-4">
                    
                    {/* Pickup Location */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center mb-1">
                            <span className="text-xs font-medium text-green-700 uppercase tracking-wide">Pickup Location</span>
                          </div>
                          <p className="text-sm text-green-900 font-medium mb-2">{request.pickupAddress}</p>
                          {request.pickupContactName && (
                            <div className="text-xs text-green-700">
                              <p><span className="font-medium">Contact:</span> {request.pickupContactName}</p>
                              <p><span className="font-medium">Phone:</span> {request.pickupPhone}</p>
                            </div>
                          )}
                          {request.pickupInstructions && (
                            <p className="text-xs text-green-600 mt-2 italic">{request.pickupInstructions}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Route Arrow */}
                    <div className="flex justify-center">
                      <div className="flex items-center">
                        <div className="w-8 border-t-2 border-gray-300 border-dashed"></div>
                        <svg className="w-4 h-4 text-gray-400 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <div className="w-8 border-t-2 border-gray-300 border-dashed"></div>
                      </div>
                    </div>
                    
                    {/* Delivery Location */}
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center mb-1">
                            <span className="text-xs font-medium text-red-700 uppercase tracking-wide">Delivery Location</span>
                          </div>
                          <p className="text-sm text-red-900 font-medium mb-2">{request.deliveryAddress}</p>
                          {request.deliveryContactName && (
                            <div className="text-xs text-red-700">
                              <p><span className="font-medium">Contact:</span> {request.deliveryContactName}</p>
                              <p><span className="font-medium">Phone:</span> {request.deliveryPhone}</p>
                            </div>
                          )}
                          {request.deliveryInstructions && (
                            <p className="text-xs text-red-600 mt-2 italic">{request.deliveryInstructions}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Items Details */}
          <Card>
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <CubeIcon className="h-5 w-5 text-orange-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Items to Deliver</h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {request.items.length} item{request.items.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {request.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                        </div>
                        <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        {item.fragile && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-200 bg-orange-50">
                            ⚠️ Fragile
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
                      <p className="text-sm text-gray-900 mt-1">{item.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</label>
                        <p className="text-sm text-gray-900 mt-1 flex items-center">
                          <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                          {item.quantity}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weight</label>
                        <p className="text-sm text-gray-900 mt-1 flex items-center">
                          <ScaleIcon className="h-3 w-3 mr-2 text-gray-400" />
                          {item.weight || 0} kg
                        </p>
                      </div>
                      {item.dimensions && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dimensions</label>
                          <p className="text-sm text-gray-900 mt-1 flex items-center">
                            <CubeIcon className="h-3 w-3 mr-2 text-gray-400" />
                            {item.dimensions}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {item.value && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Declared Value</label>
                        <p className="text-sm text-gray-900 mt-1 flex items-center">
                          <CurrencyDollarIcon className="h-3 w-3 mr-2 text-gray-400" />
                          AED {item.value}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Reject Request Modal */}
      <RejectRequestModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        request={request}
        onReject={handleRejectSubmit}
        isRejecting={updating}
      />
    </div>
  );
}