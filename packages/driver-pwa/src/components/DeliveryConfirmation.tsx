'use client';

import { useState } from 'react';
import { useDriver } from '@/providers/DriverProvider';
import PhotoCapture from './PhotoCapture';
import QRScanner from './QRScanner';
import { 
  CheckCircleIcon,
  XMarkIcon,
  CameraIcon,
  QrCodeIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  UserIcon,
  MapPinIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface DeliveryConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: any;
  type: 'pickup' | 'delivery';
}

export default function DeliveryConfirmation({ 
  isOpen, 
  onClose, 
  delivery, 
  type 
}: DeliveryConfirmationProps) {
  const { completeAssignment } = useDriver();
  
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showFailureReason, setShowFailureReason] = useState(false);
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [qrCode, setQrCode] = useState<string>('');
  const [failureReason, setFailureReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !delivery) return null;

  const location = type === 'pickup' ? delivery.pickup : delivery.delivery;
  const requiresSignature = delivery.package?.requiresSignature && type === 'delivery';

  const handlePhotoCapture = (capturedPhotos: string[]) => {
    setPhotos(capturedPhotos);
    setShowPhotoCapture(false);
  };

  const handleQRScan = (result: string) => {
    setQrCode(result);
    setShowQRScanner(false);
    
    // Auto-validate QR code matches delivery
    if (result === delivery.trackingNumber) {
      // Show success feedback
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    try {
      await completeAssignment(delivery.id, notes, signature);
      onClose();
    } catch (error) {
      console.error('Failed to complete delivery:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkFailed = async () => {
    if (!failureReason.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // TODO: Implement failure marking
      console.log('Marking delivery as failed:', delivery.id, failureReason);
      onClose();
    } catch (error) {
      console.error('Failed to mark delivery as failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canComplete = () => {
    if (requiresSignature && !signature) return false;
    if (delivery.package?.requiresPhoto && photos.length === 0) return false;
    return true;
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {type === 'pickup' ? 'Confirm Pickup' : 'Confirm Delivery'}
              </h2>
              <p className="text-sm text-primary-100">#{delivery.trackingNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {/* Location Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <MapPinIcon className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{location.address}</h3>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{location.contactName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{location.scheduledTime}</span>
                  </div>
                </div>
                {location.instructions && (
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Instructions:</strong> {location.instructions}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Package Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Package Details</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Description:</strong> {delivery.package.description}</p>
              <p><strong>Weight:</strong> {delivery.package.weight}kg</p>
              <p><strong>Dimensions:</strong> {delivery.package.dimensions}</p>
              {delivery.package.fragile && (
                <p className="text-orange-600"><strong>⚠️ Fragile item</strong></p>
              )}
              {requiresSignature && (
                <p className="text-blue-600"><strong>✍️ Signature required</strong></p>
              )}
            </div>
          </div>

          {/* QR Code Scanner */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scan Package QR Code
            </label>
            <button
              onClick={() => setShowQRScanner(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary hover:bg-primary-50 transition-colors"
            >
              {qrCode ? (
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>QR Code Scanned</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                  <QrCodeIcon className="h-5 w-5" />
                  <span>Tap to scan QR code</span>
                </div>
              )}
            </button>
          </div>

          {/* Photo Capture */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Take Photos
              {delivery.package?.requiresPhoto && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <button
              onClick={() => setShowPhotoCapture(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary hover:bg-primary-50 transition-colors"
            >
              {photos.length > 0 ? (
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>{photos.length} Photo{photos.length > 1 ? 's' : ''} Captured</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                  <CameraIcon className="h-5 w-5" />
                  <span>Tap to take photos</span>
                </div>
              )}
            </button>
            
            {photos.length > 0 && (
              <div className="flex space-x-2 mt-2 overflow-x-auto">
                {photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Signature Capture (for deliveries only) */}
          {requiresSignature && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Signature <span className="text-red-500">*</span>
              </label>
              <button
                onClick={() => setShowSignature(true)}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary hover:bg-primary-50 transition-colors"
              >
                {signature ? (
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span>Signature Captured</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2 text-gray-500">
                    <PencilIcon className="h-5 w-5" />
                    <span>Tap to capture signature</span>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              placeholder="Any additional notes about the delivery..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          {showFailureReason ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for failure
                </label>
                <textarea
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="Please provide a reason for the failed delivery..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFailureReason(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkFailed}
                  disabled={!failureReason.trim() || isSubmitting}
                  className="flex-1 btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Mark as Failed'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFailureReason(true)}
                className="flex-1 btn-secondary flex items-center justify-center space-x-2"
              >
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>Mark Failed</span>
              </button>
              
              <button
                onClick={handleComplete}
                disabled={!canComplete() || isSubmitting}
                className="flex-2 btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <CheckCircleIcon className="h-5 w-5" />
                <span>
                  {isSubmitting 
                    ? 'Submitting...' 
                    : type === 'pickup' 
                      ? 'Confirm Pickup' 
                      : 'Confirm Delivery'
                  }
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Capture Modal */}
      <PhotoCapture
        isOpen={showPhotoCapture}
        onClose={() => setShowPhotoCapture(false)}
        onCapture={handlePhotoCapture}
        title={`${type === 'pickup' ? 'Pickup' : 'Delivery'} Photos`}
        subtitle="Take photos to confirm the package condition"
        maxPhotos={5}
        required={delivery.package?.requiresPhoto}
      />

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
        title="Scan Package QR Code"
        subtitle="Scan the QR code on the package to verify"
      />

      {/* Signature Capture Modal - Simple implementation */}
      {showSignature && (
        <div className="fixed inset-0 z-60 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Customer Signature</h3>
            <div className="border-2 border-gray-300 rounded-lg h-32 mb-4 flex items-center justify-center">
              <p className="text-gray-500 text-sm">Signature pad placeholder</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSignature(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSignature('signature_captured');
                  setShowSignature(false);
                }}
                className="flex-1 btn-primary"
              >
                Save Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}