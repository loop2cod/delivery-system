'use client';

import { useRef, useState, useCallback } from 'react';
import { 
  CameraIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  PhotoIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface PhotoCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photos: string[]) => void;
  title?: string;
  subtitle?: string;
  maxPhotos?: number;
  required?: boolean;
}

export default function PhotoCapture({
  isOpen,
  onClose,
  onCapture,
  title = "Take Photos",
  subtitle = "Capture photos for delivery confirmation",
  maxPhotos = 5,
  required = false
}: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setIsCameraActive(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotSupportedError') {
        setError('Camera not supported on this device.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setIsCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || photos.length >= maxPhotos) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setPhotos(prev => [...prev, photoData]);

    // Flash effect
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: white;
      z-index: 9999;
      opacity: 0.8;
      pointer-events: none;
    `;
    document.body.appendChild(flash);
    setTimeout(() => document.body.removeChild(flash), 100);

    // Vibrate if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [photos.length, maxPhotos]);

  const deletePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (photos.length >= maxPhotos) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhotos(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = () => {
    if (required && photos.length === 0) {
      setError('At least one photo is required');
      return;
    }
    onCapture(photos);
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    setPhotos([]);
    setError(null);
    onClose();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Start camera when component opens
  React.useEffect(() => {
    if (isOpen && !isCameraActive) {
      startCamera();
    }
    
    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen, isCameraActive, startCamera, stopCamera]);

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
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {photos.length}/{maxPhotos}
            </span>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Camera View */}
      <div className="photo-capture-container h-full">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-y-2">
                <button
                  onClick={startCamera}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full btn-secondary flex items-center justify-center space-x-2"
                >
                  <PhotoIcon className="h-4 w-4" />
                  <span>Choose from Gallery</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isStreaming && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
        )}

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Bottom Controls */}
      {!error && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <div className="flex space-x-2 mb-4 overflow-x-auto">
              {photos.map((photo, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => deletePhoto(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Camera controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors text-white"
            >
              <PhotoIcon className="h-6 w-6" />
            </button>

            <button
              onClick={capturePhoto}
              disabled={photos.length >= maxPhotos || !isStreaming}
              className="w-16 h-16 rounded-full border-4 border-white bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <CameraIcon className="h-8 w-8 text-white" />
            </button>

            <button
              onClick={switchCamera}
              className="p-4 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors text-white"
            >
              <ArrowPathIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleClose}
              className="flex-1 btn-secondary text-center py-3"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={required && photos.length === 0}
              className="flex-1 btn-success text-center py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckIcon className="h-5 w-5" />
              <span>
                {photos.length > 0 ? `Use ${photos.length} Photo${photos.length > 1 ? 's' : ''}` : 'Skip'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}