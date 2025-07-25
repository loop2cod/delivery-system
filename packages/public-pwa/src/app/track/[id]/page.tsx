'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
// import QRCodeScanner from '@delivery-uae/shared/components/QRCodeScanner';
import { QRCodeData } from '@delivery-uae/shared';

interface TrackingInfo {
  id: string;
  type: string;
  status: string;
  customerName?: string;
  businessName?: string;
  driverName?: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    location?: any;
    notes?: string;
  }>;
  estimatedDelivery?: string;
  actualDelivery?: string;
  trackingNumber?: string;
}

export default function TrackingPage() {
  const params = useParams();
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [trackingInput, setTrackingInput] = useState(params?.id as string || '');

  useEffect(() => {
    if (params?.id) {
      trackPackage(params.id as string);
    } else {
      setLoading(false);
    }
  }, [params?.id]);

  const trackPackage = async (trackingId: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/qr/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qrData: JSON.stringify({
            type: 'tracking',
            id: trackingId,
            timestamp: Date.now()
          })
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTrackingInfo(result.trackingInfo);
      } else if (response.status === 404) {
        setError('Package not found. Please check your tracking ID.');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to track package');
      }
    } catch (err) {
      console.error('Tracking failed:', err);
      setError('Unable to connect to tracking service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (qrData: QRCodeData) => {
    setScannerOpen(false);
    trackPackage(qrData.id);
    setTrackingInput(qrData.id);
  };

  const handleScanError = (error: string) => {
    console.error('QR Scan Error:', error);
    alert(`Scan error: ${error}`);
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingInput.trim()) {
      trackPackage(trackingInput.trim());
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'assigned': 'bg-purple-100 text-purple-800',
      'picked_up': 'bg-orange-100 text-orange-800',
      'in_transit': 'bg-blue-100 text-blue-800',
      'delivered': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'pending': '⏳',
      'confirmed': '✅',
      'assigned': '👤',
      'picked_up': '📦',
      'in_transit': '🚚',
      'delivered': '✅',
      'failed': '❌',
      'cancelled': '🚫'
    };
    return icons[status as keyof typeof icons] || '📋';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#142C4F] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold">Track Your Package</h1>
          <p className="mt-2 text-blue-100">Enter your tracking ID or scan a QR code to track your delivery</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tracking Input Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <form onSubmit={handleTrackSubmit} className="space-y-4">
            <div>
              <label htmlFor="tracking-id" className="block text-sm font-medium text-gray-700 mb-2">
                Tracking ID
              </label>
              <div className="flex gap-2">
                <input
                  id="tracking-id"
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Enter your tracking ID"
                  className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#142C4F] focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!trackingInput.trim() || loading}
                  className="px-6 py-3 bg-[#C32C3C] text-white rounded-md hover:bg-[#a82633] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Tracking...' : 'Track'}
                </button>
              </div>
            </div>
            
            <div className="text-center">
              <span className="text-gray-500 text-sm">or</span>
            </div>
            
            <button
              type="button"
              onClick={() => alert('QR Scanner temporarily disabled')}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-[#142C4F] hover:text-[#142C4F] transition-colors"
            >
              <span className="mr-2">📱</span>
              Scan QR Code (Coming Soon)
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#142C4F] mr-4"></div>
              <span className="text-gray-600">Tracking your package...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <div className="text-red-600 text-2xl mr-3">❌</div>
              <div>
                <h3 className="text-red-800 font-medium">Tracking Error</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Results */}
        {trackingInfo && (
          <div className="space-y-6">
            {/* Package Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Package Details</h2>
                <span 
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trackingInfo.status)}`}
                >
                  <span className="mr-1">{getStatusIcon(trackingInfo.status)}</span>
                  {trackingInfo.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Tracking Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Tracking ID:</span>
                      <span className="ml-2 font-mono text-sm font-medium">{trackingInfo.id}</span>
                    </div>
                    {trackingInfo.trackingNumber && (
                      <div>
                        <span className="text-sm text-gray-600">Tracking Number:</span>
                        <span className="ml-2 font-mono text-sm font-medium">{trackingInfo.trackingNumber}</span>
                      </div>
                    )}
                    {trackingInfo.businessName && (
                      <div>
                        <span className="text-sm text-gray-600">From:</span>
                        <span className="ml-2 text-sm font-medium">{trackingInfo.businessName}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Delivery Information</h3>
                  <div className="space-y-2">
                    {trackingInfo.customerName && (
                      <div>
                        <span className="text-sm text-gray-600">Recipient:</span>
                        <span className="ml-2 text-sm font-medium">{trackingInfo.customerName}</span>
                      </div>
                    )}
                    {trackingInfo.driverName && (
                      <div>
                        <span className="text-sm text-gray-600">Driver:</span>
                        <span className="ml-2 text-sm font-medium">{trackingInfo.driverName}</span>
                      </div>
                    )}
                    {trackingInfo.estimatedDelivery && (
                      <div>
                        <span className="text-sm text-gray-600">Estimated Delivery:</span>
                        <span className="ml-2 text-sm font-medium">
                          {new Date(trackingInfo.estimatedDelivery).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tracking Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Tracking Timeline</h2>
              
              <div className="flow-root">
                <ul className="-mb-8">
                  {trackingInfo.statusHistory.map((event, index) => (
                    <li key={index}>
                      <div className="relative pb-8">
                        {index !== trackingInfo.statusHistory.length - 1 && (
                          <span 
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span 
                              className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white text-sm ${
                                index === 0 ? 'bg-[#C32C3C] text-white' : 'bg-gray-400 text-white'
                              }`}
                            >
                              {getStatusIcon(event.status)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {event.status.replace('_', ' ').toUpperCase()}
                              </p>
                              {event.notes && (
                                <p className="text-sm text-gray-500">{event.notes}</p>
                              )}
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <time dateTime={event.timestamp}>
                                {new Date(event.timestamp).toLocaleString()}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Additional Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="/contact"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-2xl mr-3">📞</div>
                  <div>
                    <div className="font-medium text-gray-900">Contact Support</div>
                    <div className="text-sm text-gray-500">Get help with your delivery</div>
                  </div>
                </a>
                
                <button
                  onClick={() => {
                    setTrackingInfo(null);
                    setTrackingInput('');
                    setError('');
                  }}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-2xl mr-3">🔍</div>
                  <div>
                    <div className="font-medium text-gray-900">Track Another Package</div>
                    <div className="text-sm text-gray-500">Search for a different delivery</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Results State */}
        {!loading && !error && !trackingInfo && trackingInput && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Track</h3>
            <p className="text-gray-500">Enter a tracking ID or scan a QR code to get started</p>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {/* <QRCodeScanner
        isOpen={scannerOpen}
        onScan={handleQRScan}
        onError={handleScanError}
        onClose={() => setScannerOpen(false)}
        allowMultipleScan={false}
      /> */}
    </div>
  );
}