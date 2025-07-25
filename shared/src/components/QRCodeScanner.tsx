'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { QRCodeManager, QRCodeData } from '../qr-utils';

interface QRCodeScannerProps {
  onScan: (data: QRCodeData) => void;
  onError: (error: string) => void;
  onClose?: () => void;
  isOpen: boolean;
  allowMultipleScan?: boolean;
  scanDelay?: number;
  className?: string;
}

interface ScanResult {
  data: QRCodeData;
  timestamp: number;
  raw: string;
}

export default function QRCodeScanner({
  onScan,
  onError,
  onClose,
  isOpen,
  allowMultipleScan = false,
  scanDelay = 2000,
  className = ''
}: QRCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [currentDevice, setCurrentDevice] = useState<string>('');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [flashlightSupported, setFlashlightSupported] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);

  const qrManager = new QRCodeManager();

  // Initialize camera when scanner opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen]);

  // Get available camera devices
  const getAvailableDevices = async (): Promise<MediaDeviceInfo[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('[QR Scanner] Failed to get devices:', error);
      return [];
    }
  };

  // Initialize camera
  const initializeCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Get available devices
      const devices = await getAvailableDevices();
      setAvailableDevices(devices);

      // Prefer back camera on mobile devices
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );

      const deviceId = backCamera?.deviceId || devices[0]?.deviceId;
      setCurrentDevice(deviceId || '');

      // Request camera permission
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: backCamera ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Check if flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      setFlashlightSupported(!!capabilities?.torch);

      setHasPermission(true);
      setIsScanning(true);
      startScanning();
    } catch (error) {
      console.error('[QR Scanner] Camera initialization failed:', error);
      setHasPermission(false);
      onError(error instanceof Error ? error.message : 'Camera access denied');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    setIsScanning(false);
    setFlashlightOn(false);
  };

  // Switch camera device
  const switchCamera = async (deviceId: string) => {
    stopCamera();
    setCurrentDevice(deviceId);
    
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsScanning(true);
      startScanning();
    } catch (error) {
      console.error('[QR Scanner] Camera switch failed:', error);
      onError('Failed to switch camera');
    }
  };

  // Toggle flashlight
  const toggleFlashlight = async () => {
    if (!streamRef.current || !flashlightSupported) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ torch: !flashlightOn }]
      });
      setFlashlightOn(!flashlightOn);
    } catch (error) {
      console.error('[QR Scanner] Flashlight toggle failed:', error);
    }
  };

  // Start scanning process
  const startScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = setInterval(() => {
      scanFrame();
    }, 100); // Scan every 100ms
  };

  // Scan current video frame
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Get image data for QR scanning
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const qrResult = scanImageData(imageData);

      if (qrResult) {
        handleScanResult(qrResult);
      }
    } catch (error) {
      console.error('[QR Scanner] Frame scan failed:', error);
    }
  }, [isScanning]);

  // Scan image data for QR codes (simplified implementation)
  const scanImageData = (imageData: ImageData): string | null => {
    // This is a simplified implementation
    // In a real app, you'd use a QR code scanning library like jsQR
    // For now, we'll simulate QR detection for demo purposes
    
    // Check if there's significant contrast that might indicate a QR code
    const data = imageData.data;
    let blackPixels = 0;
    let whitePixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness < 100) blackPixels++;
      else if (brightness > 200) whitePixels++;
    }
    
    // If there's a good mix of black and white pixels, simulate QR detection
    const contrastRatio = Math.min(blackPixels, whitePixels) / Math.max(blackPixels, whitePixels);
    if (contrastRatio > 0.1 && blackPixels > 1000 && whitePixels > 1000) {
      // Return a simulated QR code for testing
      return JSON.stringify({
        type: 'package',
        id: 'TEST_PACKAGE_123',
        timestamp: Date.now(),
        metadata: { scanned: true }
      });
    }
    
    return null;
  };

  // Handle scan result
  const handleScanResult = (rawData: string) => {
    const now = Date.now();
    
    // Prevent duplicate scans
    if (!allowMultipleScan && 
        rawData === lastScanRef.current && 
        now - lastScanTimeRef.current < scanDelay) {
      return;
    }

    // Parse QR data
    const qrData = qrManager.parseQRData(rawData);
    
    if (!qrData) {
      onError('Invalid QR code format');
      return;
    }

    // Update scan tracking
    lastScanRef.current = rawData;
    lastScanTimeRef.current = now;

    // Add to scan history
    const scanResult: ScanResult = {
      data: qrData,
      timestamp: now,
      raw: rawData
    };
    
    setScanHistory(prev => [scanResult, ...prev.slice(0, 4)]); // Keep last 5 scans

    // Call onScan callback
    onScan(qrData);

    // Stop scanning if not allowing multiple scans
    if (!allowMultipleScan) {
      setIsScanning(false);
    }
  };

  // Retry camera initialization
  const retryCamera = () => {
    setHasPermission(null);
    initializeCamera();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center ${className}`}>
      <div className="relative w-full h-full max-w-lg max-h-screen bg-black rounded-lg overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <h2 className="text-lg font-semibold">Scan QR Code</h2>
            <div className="flex items-center gap-2">
              {/* Flashlight Toggle */}
              {flashlightSupported && (
                <button
                  onClick={toggleFlashlight}
                  className={`p-2 rounded-full ${flashlightOn ? 'bg-yellow-500' : 'bg-gray-600'} text-white`}
                  title="Toggle Flashlight"
                >
                  {flashlightOn ? '🔦' : '💡'}
                </button>
              )}
              
              {/* Camera Switch */}
              {availableDevices.length > 1 && (
                <select
                  value={currentDevice}
                  onChange={(e) => switchCamera(e.target.value)}
                  className="bg-gray-600 text-white text-sm rounded px-2 py-1"
                >
                  {availableDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              )}
              
              {/* Close Button */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700"
                  title="Close Scanner"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Camera View */}
        <div className="relative w-full h-full">
          {hasPermission === null && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Initializing camera...</p>
              </div>
            </div>
          )}

          {hasPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center text-white p-6">
              <div className="text-center">
                <div className="text-6xl mb-4">📷</div>
                <h3 className="text-xl font-semibold mb-2">Camera Access Required</h3>
                <p className="mb-4 text-gray-300">
                  Please allow camera access to scan QR codes
                </p>
                <button
                  onClick={retryCamera}
                  className="px-6 py-3 bg-[#C32C3C] text-white rounded-lg hover:bg-[#a82633] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {hasPermission && (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Scanning Frame */}
                  <div className="w-64 h-64 border-2 border-white rounded-lg relative">
                    {/* Corner Markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#C32C3C] rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#C32C3C] rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#C32C3C] rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#C32C3C] rounded-br-lg"></div>
                    
                    {/* Scanning Line Animation */}
                    {isScanning && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-[#C32C3C] animate-pulse"></div>
                    )}
                  </div>
                  
                  {/* Instructions */}
                  <p className="text-white text-center mt-4 text-sm">
                    Position QR code within the frame
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Hidden canvas for image processing */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </div>

        {/* Bottom Panel */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Scan Status */}
          <div className="text-center mb-4">
            {isScanning ? (
              <div className="flex items-center justify-center text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm">Scanning...</span>
              </div>
            ) : (
              <span className="text-gray-400 text-sm">Scanning paused</span>
            )}
          </div>

          {/* Recent Scans */}
          {scanHistory.length > 0 && (
            <div className="bg-black/50 rounded-lg p-3 mb-4">
              <h4 className="text-white text-sm font-medium mb-2">Recent Scans</h4>
              <div className="space-y-1">
                {scanHistory.slice(0, 3).map((scan, index) => (
                  <div key={index} className="flex items-center justify-between text-xs text-gray-300">
                    <span>{scan.data.type}: {scan.data.id}</span>
                    <span>{new Date(scan.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsScanning(!isScanning)}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                isScanning 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isScanning ? 'Pause Scanning' : 'Resume Scanning'}
            </button>
            
            {allowMultipleScan && (
              <button
                onClick={() => setScanHistory([])}
                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Clear History"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}