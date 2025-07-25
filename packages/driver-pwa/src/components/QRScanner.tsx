'use client';

import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { 
  XMarkIcon,
  CameraIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  title?: string;
  subtitle?: string;
}

export default function QRScanner({ 
  isOpen, 
  onClose, 
  onScan, 
  title = "Scan QR Code",
  subtitle = "Position the QR code within the frame to scan"
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    const initScanner = async () => {
      try {
        setError(null);
        setIsScanning(true);

        // Check camera permission
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          throw new Error('No camera found on this device');
        }

        // Create QR scanner instance
        const qrScanner = new QrScanner(
          videoRef.current!,
          (result) => {
            if (result.data && result.data !== lastScanResult) {
              setLastScanResult(result.data);
              setShowSuccess(true);
              
              // Vibrate if available
              if ('vibrate' in navigator) {
                navigator.vibrate(100);
              }
              
              // Show success briefly then callback
              setTimeout(() => {
                onScan(result.data);
                setShowSuccess(false);
              }, 1000);
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment', // Use back camera on mobile
          }
        );

        qrScannerRef.current = qrScanner;
        await qrScanner.start();
        setHasPermission(true);
        
      } catch (err: any) {
        console.error('Scanner initialization failed:', err);
        setHasPermission(false);
        
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported on this device.');
        } else {
          setError(err.message || 'Failed to initialize camera');
        }
      } finally {
        setIsScanning(false);
      }
    };

    initScanner();

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [isOpen, onScan, lastScanResult]);

  const handleRetry = () => {
    setError(null);
    setHasPermission(null);
    // Re-trigger initialization
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
  };

  const toggleFlash = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.toggleFlash();
      } catch (err) {
        console.error('Flash toggle failed:', err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-gray-300">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Scanner Container */}
      <div className="qr-scanner-container h-full">
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="loading-dots text-white">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {hasPermission === false && error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Access Required</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-y-2">
                <button
                  onClick={handleRetry}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {hasPermission && !showSuccess && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Scanner Overlay */}
            <div className="qr-scanner-overlay">
              <div className="qr-scanner-frame relative">
                {/* Corner indicators */}
                <div className="qr-scanner-corners top-left"></div>
                <div className="qr-scanner-corners top-right"></div>
                <div className="qr-scanner-corners bottom-left"></div>
                <div className="qr-scanner-corners bottom-right"></div>
                
                {/* Scanning line animation */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="h-0.5 bg-white animate-bounce-in shadow-lg"></div>
                </div>
              </div>
            </div>
          </>
        )}

        {showSuccess && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-70">
            <div className="text-center text-white">
              <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4 animate-bounce-in" />
              <h3 className="text-xl font-semibold mb-2">Scan Successful!</h3>
              <p className="text-gray-300">Processing...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      {hasPermission && !showSuccess && !isScanning && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
          <div className="flex items-center justify-center space-x-8">
            <button
              onClick={toggleFlash}
              className="p-4 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors text-white"
            >
              <span className="text-sm">Flash</span>
            </button>
            
            <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
              <CameraIcon className="h-8 w-8 text-white" />
            </div>
            
            <button
              onClick={onClose}
              className="p-4 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors text-white"
            >
              <span className="text-sm">Cancel</span>
            </button>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-white text-sm">
              Align the QR code within the frame
            </p>
          </div>
        </div>
      )}
    </div>
  );
}