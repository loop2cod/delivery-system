'use client';

import { useState } from 'react';
import { 
  XMarkIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DeliveryRequest } from '@/lib/api';

interface RejectRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: DeliveryRequest | null;
  onReject: (reason: string) => void;
  isRejecting?: boolean;
}

export function RejectRequestModal({ 
  isOpen, 
  onClose, 
  request, 
  onReject,
  isRejecting = false
}: RejectRequestModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  if (!request) return null;

  const commonReasons = [
    { value: 'insufficient_details', label: 'Insufficient pickup/delivery details' },
    { value: 'outside_area', label: 'Outside service area' },
    { value: 'weight_exceeds', label: 'Weight exceeds capacity' },
    { value: 'prohibited_items', label: 'Contains prohibited items' },
    { value: 'duplicate_request', label: 'Duplicate request' },
    { value: 'company_issues', label: 'Company account issues' },
    { value: 'other', label: 'Other (please specify)' }
  ];

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    
    try {
      const fullReason = selectedCategory ? 
        `${commonReasons.find(r => r.value === selectedCategory)?.label}: ${rejectReason}` : 
        rejectReason;
      
      await onReject(fullReason);
      handleClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleClose = () => {
    if (!isRejecting) {
      setRejectReason('');
      setSelectedCategory('');
      onClose();
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    if (category !== 'other') {
      setRejectReason(''); // Clear custom reason when selecting predefined category
    }
  };

  const isFormValid = () => {
    if (selectedCategory && selectedCategory !== 'other') {
      return true; // Predefined categories don't need additional text
    }
    return rejectReason.trim().length >= 10; // Minimum 10 characters for custom reason
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Reject Delivery Request
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Request #{request.requestNumber} from {request.company?.name}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          disabled={isRejecting}
          className="text-gray-400 hover:text-gray-500 transition-colors"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="px-6 py-4">
        {/* Warning Notice */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Important Notice
              </h3>
              <p className="mt-1 text-sm text-red-700">
                Rejecting this request will immediately notify the company and cancel the delivery. 
                Please provide a clear reason that will help them understand the rejection.
              </p>
            </div>
          </div>
        </div>

        {/* Request Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Request Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Items:</span>
              <span className="ml-2 text-gray-900">{request.items.length} item{request.items.length !== 1 ? 's' : ''}</span>
            </div>
            <div>
              <span className="text-gray-500">Weight:</span>
              <span className="ml-2 text-gray-900">{request.totalWeight} kg</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Route:</span>
              <span className="ml-2 text-gray-900 text-xs">
                {request.pickupAddress} → {request.deliveryAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Rejection Categories */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Select a rejection reason (optional)
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {commonReasons.map((reason) => (
              <label key={reason.value} className="flex items-center">
                <input
                  type="radio"
                  name="rejectionCategory"
                  value={reason.value}
                  checked={selectedCategory === reason.value}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  disabled={isRejecting}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <span className="ml-3 text-sm text-gray-700">{reason.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Reason */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            {selectedCategory === 'other' ? 'Please specify the reason' : 'Additional details (optional)'}
            {selectedCategory === 'other' && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={isRejecting}
              placeholder={
                selectedCategory === 'other' 
                  ? "Please provide a detailed reason for rejection..."
                  : "Add any additional context or instructions..."
              }
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              {rejectReason.length}/500
            </div>
          </div>
          {selectedCategory === 'other' && rejectReason.length < 10 && (
            <p className="mt-1 text-sm text-red-600">
              Please provide at least 10 characters explaining the rejection reason.
            </p>
          )}
        </div>

        {/* Preview */}
        {(selectedCategory || rejectReason.trim()) && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Preview of rejection message:
            </h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                {selectedCategory && selectedCategory !== 'other' 
                  ? `${commonReasons.find(r => r.value === selectedCategory)?.label}${rejectReason.trim() ? `: ${rejectReason}` : ''}`
                  : rejectReason.trim()
                }
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-3 sm:space-y-0">
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={isRejecting}
          className="w-full sm:w-auto order-2 sm:order-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleReject}
          disabled={!isFormValid() || isRejecting}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white order-1 sm:order-2"
          loading={isRejecting}
        >
          {isRejecting ? 'Rejecting Request...' : 'Reject Request'}
        </Button>
      </div>
    </Dialog>
  );
}