'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrCodeIcon, XMarkIcon, CameraIcon, BoltIcon as FlashIcon } from '@heroicons/react/24/outline';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { toast } from 'react-hot-toast';
import { useDriver } from '@/providers/DriverProvider';

export default function ScanPage() {
  const router = useRouter();
  const { assignments, acceptAssignment, completeAssignment } = useDriver();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    // Check if device has flash
    if (navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints) {
      const constraints = navigator.mediaDevices.getSupportedConstraints();
      setHasFlash(!!(constraints as any).torch);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const startScanning = () => {
    setIsScanning(true);
    setScannedData(null);
    setScanResult(null);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      videoConstraints: {
        facingMode: 'environment',
        torch: flashOn
      }
    };

    scannerRef.current = new Html5QrcodeScanner('qr-reader', config, false);
    
    scannerRef.current.render(
      (decodedText, decodedResult) => {
        handleScanSuccess(decodedText, decodedResult);
      },
      (error) => {
        // Handle scan error silently - too many false positives
        console.log('Scan error:', error);
      }
    );
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = (decodedText: string, decodedResult: any) => {
    setScannedData(decodedText);
    stopScanning();
    
    // Try to parse the QR code data
    try {
      const qrData = JSON.parse(decodedText);
      
      if (qrData.tracking_number) {
        // Find matching assignment
        const assignment = assignments.find(a => 
          a.tracking_number === qrData.tracking_number
        );
        
        if (assignment) {
          setScanResult({
            type: 'assignment',
            data: assignment,
            qrData
          });
          toast.success('Package found!');
        } else {
          setScanResult({
            type: 'unknown',
            data: qrData,
            qrData
          });
          toast.error('Package not assigned to you');
        }
      } else {
        setScanResult({
          type: 'generic',
          data: qrData,
          qrData
        });
      }
    } catch (error) {
      // Not JSON, treat as plain text
      setScanResult({
        type: 'text',
        data: decodedText,
        qrData: { text: decodedText }
      });
    }
  };

  const handleAcceptAssignment = async () => {
    if (scanResult?.type === 'assignment') {
      try {
        await acceptAssignment(scanResult.data.id);
        router.push('/');
      } catch (error) {
        console.error('Failed to accept assignment:', error);
      }
    }
  };

  const handleCompleteDelivery = async () => {
    if (scanResult?.type === 'assignment') {
      try {
        await completeAssignment(scanResult.data.id, 'Completed via QR scan');
        router.push('/');
      } catch (error) {
        console.error('Failed to complete delivery:', error);
      }
    }
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
    if (isScanning) {
      stopScanning();
      setTimeout(() => startScanning(), 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-1 hover:bg-primary-600 rounded"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">QR Scanner</h1>
                <p className="text-xs text-primary-100">Scan package QR codes</p>
              </div>
            </div>
            
            {hasFlash && isScanning && (
              <button
                onClick={toggleFlash}
                className={`p-2 rounded-lg ${flashOn ? 'bg-yellow-500' : 'bg-primary-600'}`}
              >
                <FlashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {!isScanning && !scannedData && (
          <div className="text-center py-12">
            <QrCodeIcon className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Scan Package QR Code
            </h2>
            <p className="text-gray-600 mb-8">
              Position the QR code within the camera frame to scan
            </p>
            
            <button
              onClick={startScanning}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <CameraIcon className="h-5 w-5" />
              <span>Start Scanning</span>
            </button>
          </div>
        )}

        {isScanning && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Camera Scanner</h3>
                <button
                  onClick={stopScanning}
                  className="text-red-600 hover:text-red-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div id="qr-reader" className="w-full"></div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <QrCodeIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Scanning Tips</h4>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• Hold your device steady</li>
                    <li>• Ensure good lighting</li>
                    <li>• Keep QR code within the frame</li>
                    <li>• Move closer if needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {scanResult && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-medium mb-4">Scan Result</h3>
              
              {scanResult.type === 'assignment' && (
                <div className="space-y-4">
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-medium text-green-900">
                      Package Found: #{scanResult.data.tracking_number}
                    </h4>
                    <p className="text-sm text-green-700">
                      {scanResult.data.package_details?.description || 'Package delivery'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Pickup Location
                      </p>
                      <p className="text-sm text-gray-900">
                        {scanResult.data.pickup_location.address}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Delivery Location
                      </p>
                      <p className="text-sm text-gray-900">
                        {scanResult.data.delivery_location.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    {scanResult.data.status === 'ASSIGNED' && (
                      <button
                        onClick={handleAcceptAssignment}
                        className="flex-1 btn-primary"
                      >
                        Accept Assignment
                      </button>
                    )}
                    
                    {scanResult.data.status === 'IN_PROGRESS' && (
                      <button
                        onClick={handleCompleteDelivery}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        Complete Delivery
                      </button>
                    )}
                  </div>
                </div>
              )}

              {scanResult.type === 'unknown' && (
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-medium text-yellow-900">Package Not Assigned</h4>
                  <p className="text-sm text-yellow-700">
                    This package is not assigned to you.
                  </p>
                </div>
              )}

              {scanResult.type === 'text' && (
                <div className="border-l-4 border-gray-500 pl-4">
                  <h4 className="font-medium text-gray-900">Text Content</h4>
                  <p className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded mt-2">
                    {scanResult.data}
                  </p>
                </div>
              )}

              {scanResult.type === 'generic' && (
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-blue-900">QR Code Data</h4>
                  <pre className="text-xs text-blue-700 font-mono bg-blue-50 p-2 rounded mt-2 overflow-x-auto">
                    {JSON.stringify(scanResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setScannedData(null);
                  setScanResult(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Scan Another
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="flex-1 btn-primary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}