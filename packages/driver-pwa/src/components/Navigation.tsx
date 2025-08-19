'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocation } from '@/providers/LocationProvider';
import { 
  MapIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
  destination: {
    lat: number;
    lng: number;
    address: string;
    contactName: string;
    contactPhone: string;
    type: 'pickup' | 'delivery';
  };
  delivery?: {
    id: string;
    trackingNumber: string;
    estimatedTime: string;
  };
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: string;
}

interface RouteInfo {
  distance: number;
  duration: number;
  steps: RouteStep[];
  coordinates: [number, number][];
}

export default function Navigation({ isOpen, onClose, destination, delivery }: NavigationProps) {
  const { currentLocation } = useLocation();
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Custom icons
  const currentLocationIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B82F6" width="24" height="24">
        <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const destinationIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${destination.type === 'pickup' ? '#22C55E' : '#EF4444'}" width="32" height="32">
        <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  // Fetch route when component opens
  useEffect(() => {
    if (isOpen && currentLocation) {
      fetchRoute();
    }
  }, [isOpen, currentLocation, destination]);

  // Voice navigation
  useEffect(() => {
    if (voiceEnabled && route && route.steps[currentStep]) {
      speakInstruction(route.steps[currentStep].instruction);
    }
  }, [currentStep, voiceEnabled, route]);

  const fetchRoute = async () => {
    if (!currentLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      // Mock route calculation - replace with actual routing service
      const response = await fetch('/api/routing/directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: currentLocation,
          destination: destination,
          mode: 'driving',
        }),
      });

      if (response.ok) {
        const routeData = await response.json();
        setRoute(routeData);
      } else {
        // Fallback to simple straight line route
        const distance = calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          destination.lat,
          destination.lng
        );

        setRoute({
          distance: distance,
          duration: Math.round(distance * 2), // Rough estimate: 2 minutes per km
          steps: [
            {
              instruction: `Head to ${destination.address}`,
              distance: distance * 1000,
              duration: Math.round(distance * 2 * 60),
              maneuver: 'straight',
            },
          ],
          coordinates: [
            [currentLocation.lat, currentLocation.lng],
            [destination.lat, destination.lng],
          ],
        });
      }
    } catch (error) {
      console.error('Failed to fetch route:', error);
      setError('Failed to load navigation route');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const speakInstruction = (instruction: string) => {
    if ('speechSynthesis' in window) {
      // Cancel previous speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(instruction);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-white ${isFullScreen ? '' : 'top-16'}`}>
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MapIcon className="h-6 w-6" />
            <div>
              <h2 className="font-semibold">
                {destination.type === 'pickup' ? 'Navigate to Pickup' : 'Navigate to Delivery'}
              </h2>
              {delivery && (
                <p className="text-xs text-primary-100">#{delivery.trackingNumber}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
            >
              {voiceEnabled ? (
                <SpeakerWaveIcon className="h-5 w-5" />
              ) : (
                <SpeakerXMarkIcon className="h-5 w-5" />
              )}
            </button>
            
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
            >
              <ArrowsPointingOutIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Route Info */}
        {route && (
          <div className="mt-4 flex items-center space-x-6">
            <div className="flex items-center space-x-1">
              <ClockIcon className="h-4 w-4" />
              <span className="text-sm">{formatDuration(route.duration)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapIcon className="h-4 w-4" />
              <span className="text-sm">{formatDistance(route.distance * 1000)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 p-4">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Navigation Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchRoute}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {currentLocation && (
          <MapContainer
            center={[currentLocation.lat, currentLocation.lng]}
            zoom={15}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Current location marker */}
            <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentLocationIcon}>
              <Popup>Your Location</Popup>
            </Marker>
            
            {/* Destination marker */}
            <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
              <Popup>
                <div className="p-2">
                  <h4 className="font-medium">{destination.address}</h4>
                  <p className="text-sm text-gray-600">{destination.contactName}</p>
                </div>
              </Popup>
            </Marker>
            
            {/* Route polyline */}
            {route && route.coordinates.length > 0 && (
              <Polyline
                positions={route.coordinates}
                color="#3B82F6"
                weight={4}
                opacity={0.7}
              />
            )}
            
            <MapController currentLocation={currentLocation} destination={destination} />
          </MapContainer>
        )}
      </div>

      {/* Turn-by-turn instructions */}
      {route && route.steps.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <MapIcon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {route.steps[currentStep]?.instruction || 'Follow the route'}
              </p>
              <p className="text-sm text-gray-500">
                {route.steps[currentStep] && (
                  <>
                    In {formatDistance(route.steps[currentStep].distance)} • 
                    {formatDuration(Math.round(route.steps[currentStep].duration / 60))}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{destination.contactName}</h4>
            <p className="text-sm text-gray-600">{destination.address}</p>
          </div>
          <a
            href={`tel:${destination.contactPhone}`}
            className="btn-primary flex items-center space-x-2"
          >
            <PhoneIcon className="h-4 w-4" />
            <span>Call</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// Component to control map view
function MapController({ 
  currentLocation, 
  destination 
}: { 
  currentLocation: { lat: number; lng: number }; 
  destination: { lat: number; lng: number };
}) {
  const map = useMap();

  useEffect(() => {
    // Fit map to show both current location and destination
    const bounds = L.latLngBounds([
      [currentLocation.lat, currentLocation.lng],
      [destination.lat, destination.lng],
    ]);
    
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, currentLocation, destination]);

  return null;
}