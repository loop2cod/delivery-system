'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CameraIcon, 
  XMarkIcon, 
  PhotoIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useDriver } from '@/providers/DriverProvider';
import { toast } from 'react-hot-toast';

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export default function CameraPage() {
  const router = useRouter();
  const { assignments } = useDriver();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [photoType, setPhotoType] = useState<'delivery_proof' | 'package_condition' | 'signature'>('delivery_proof');
  const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number} | null>(null);

  const inProgressAssignments = assignments.filter(a => a.status === 'IN_PROGRESS');

  const startCamera = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }

      // Get current location
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.warn('Could not get location:', error);
          }
        );
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Could not access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add timestamp overlay
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(10, canvas.height - 60, 300, 50);
    context.fillStyle = 'white';
    context.font = '16px Arial';
    context.fillText(new Date().toLocaleString(), 20, canvas.height - 35);

    // Add location overlay if available
    if (currentLocation) {
      context.fillText(
        `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
        20,
        canvas.height - 15
      );
    }

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // Create photo object
    const photo: CapturedPhoto = {
      id: Date.now().toString(),
      dataUrl,
      timestamp: new Date(),
      location: currentLocation || undefined
    };

    setCapturedPhotos(prev => [...prev, photo]);
    toast.success('Photo captured!');
  }, [currentLocation]);

  const selectFromGallery = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      const photo: CapturedPhoto = {
        id: Date.now().toString(),
        dataUrl,
        timestamp: new Date(),
        location: currentLocation || undefined
      };

      setCapturedPhotos(prev => [...prev, photo]);
      toast.success('Photo added!');
    };

    reader.readAsDataURL(file);
  }, [currentLocation]);

  const deletePhoto = useCallback((photoId: string) => {
    setCapturedPhotos(prev => prev.filter(p => p.id !== photoId));
  }, []);

  const uploadPhotos = useCallback(async () => {
    if (capturedPhotos.length === 0) {
      toast.error('No photos to upload');
      return;
    }

    if (!selectedAssignment) {
      toast.error('Please select an assignment');
      return;
    }

    try {
      // Convert photos to FormData
      const formData = new FormData();
      
      for (let i = 0; i < capturedPhotos.length; i++) {
        const photo = capturedPhotos[i];
        
        // Convert data URL to blob
        const response = await fetch(photo.dataUrl);
        const blob = await response.blob();
        
        formData.append(`photos`, blob, `${photoType}_${photo.id}.jpg`);
        formData.append(`metadata_${i}`, JSON.stringify({
          timestamp: photo.timestamp,
          location: photo.location,
          type: photoType
        }));
      }

      formData.append('assignment_id', selectedAssignment);
      formData.append('photo_type', photoType);

      // Upload to server
      const uploadResponse = await fetch('/api/driver/photos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      toast.success('Photos uploaded successfully!');
      setCapturedPhotos([]);
      router.push('/');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload photos');
    }
  }, [capturedPhotos, selectedAssignment, photoType, router]);

  const getPhotoTypeLabel = (type: string) => {
    switch (type) {
      case 'delivery_proof': return 'Delivery Proof';
      case 'package_condition': return 'Package Condition';
      case 'signature': return 'Recipient Signature';
      default: return type;
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
                onClick={() => {
                  stopCamera();
                  router.back();
                }}
                className="p-1 hover:bg-primary-600 rounded"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Camera</h1>
                <p className="text-xs text-primary-100">Capture delivery photos</p>
              </div>
            </div>
            
            {capturedPhotos.length > 0 && (
              <button
                onClick={uploadPhotos}
                className="bg-accent text-primary px-3 py-1 rounded-lg text-sm font-medium"
              >
                Upload ({capturedPhotos.length})
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Assignment Selection */}
        {inProgressAssignments.length > 0 && (
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <h3 className="font-medium mb-3">Select Assignment</h3>
            <select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose assignment...</option>
              {inProgressAssignments.map(assignment => (
                <option key={assignment.id} value={assignment.id}>
                  #{assignment.tracking_number} - {assignment.delivery_location.address}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Photo Type Selection */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h3 className="font-medium mb-3">Photo Type</h3>
          <div className="grid grid-cols-1 gap-2">
            {(['delivery_proof', 'package_condition', 'signature'] as const).map(type => (
              <label key={type} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="photoType"
                  value={type}
                  checked={photoType === type}
                  onChange={(e) => setPhotoType(e.target.value as any)}
                  className="text-blue-600"
                />
                <span className="text-sm">{getPhotoTypeLabel(type)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Camera View */}
        {!isStreaming && capturedPhotos.length === 0 && (
          <div className="text-center py-12">
            <CameraIcon className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Capture Photos
            </h2>
            <p className="text-gray-600 mb-8">
              Take photos for delivery verification and proof
            </p>
            
            <div className="flex flex-col space-y-3 max-w-xs mx-auto">
              <button
                onClick={startCamera}
                className="btn-primary flex items-center justify-center space-x-2"
              >
                <CameraIcon className="h-5 w-5" />
                <span>Open Camera</span>
              </button>
              
              <button
                onClick={selectFromGallery}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-2"
              >
                <PhotoIcon className="h-5 w-5" />
                <span>Select from Gallery</span>
              </button>
            </div>
          </div>
        )}

        {/* Camera Stream */}
        {isStreaming && (
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
                style={{ maxHeight: '400px', objectFit: 'cover' }}
              />
              
              {/* Camera Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-full"></div>
                </button>
                
                <button
                  onClick={stopCamera}
                  className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Captured Photos */}
        {capturedPhotos.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Captured Photos ({capturedPhotos.length})</h3>
              {!isStreaming && (
                <div className="flex space-x-2">
                  <button
                    onClick={startCamera}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Take More
                  </button>
                  <button
                    onClick={selectFromGallery}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Add from Gallery
                  </button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {capturedPhotos.map(photo => (
                <div key={photo.id} className="relative">
                  <img
                    src={photo.dataUrl}
                    alt="Captured"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  
                  {/* Photo Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 rounded-b-lg">
                    <p className="text-xs">
                      {photo.timestamp.toLocaleTimeString()}
                    </p>
                    {photo.location && (
                      <div className="flex items-center space-x-1 text-xs">
                        <MapPinIcon className="h-3 w-3" />
                        <span>GPS</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={uploadPhotos}
                disabled={!selectedAssignment}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <CheckCircleIcon className="h-5 w-5" />
                <span>Upload Photos</span>
              </button>
              
              {!selectedAssignment && (
                <p className="text-xs text-red-600 mt-2 text-center">
                  Please select an assignment first
                </p>
              )}
            </div>
          </div>
        )}

        {/* No Assignments Warning */}
        {inProgressAssignments.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <DocumentIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900">No Active Deliveries</h4>
                <p className="text-xs text-yellow-700 mt-1">
                  You need to have active deliveries to upload photos. Accept an assignment first.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Hidden canvas for photo processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
}