'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  currentLocation?: { lat: number; lng: number } | null;
  route?: {
    waypoints: Array<{
      id: string;
      address: string;
      coordinates: [number, number];
      type: 'pickup' | 'delivery';
      assignment_id?: string;
    }>;
  } | null;
  assignments?: any[];
  height?: string;
  onLocationClick?: (lat: number, lng: number) => void;
}

export default function MapComponent({
  currentLocation,
  route,
  assignments = [],
  height = '400px',
  onLocationClick
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([25.2048, 55.2708], 11); // Dubai center

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;

    // Handle map clicks
    if (onLocationClick) {
      map.on('click', (e) => {
        onLocationClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onLocationClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Clear existing markers and layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const bounds = L.latLngBounds([]);

    // Add current location marker
    if (currentLocation) {
      const currentLocationIcon = L.divIcon({
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #3B82F6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        className: 'current-location-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([currentLocation.lat, currentLocation.lng], { icon: currentLocationIcon })
        .addTo(map)
        .bindPopup('Your Location');

      bounds.extend([currentLocation.lat, currentLocation.lng]);
    }

    // Add route waypoints
    if (route && route.waypoints.length > 0) {
      const routeCoordinates: L.LatLngExpression[] = [];

      route.waypoints.forEach((waypoint, index) => {
        const [lng, lat] = waypoint.coordinates;
        const assignment = assignments.find(a => a.id === waypoint.assignment_id);

        // Create custom icon based on waypoint type
        const iconHtml = waypoint.type === 'pickup' 
          ? `<div style="
              width: 24px;
              height: 24px;
              background: #10B981;
              border: 2px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              font-weight: bold;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${index + 1}</div>`
          : `<div style="
              width: 24px;
              height: 24px;
              background: #EF4444;
              border: 2px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              font-weight: bold;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${index + 1}</div>`;

        const waypointIcon = L.divIcon({
          html: iconHtml,
          className: 'waypoint-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const popupContent = `
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; font-weight: bold;">
              ${waypoint.type === 'pickup' ? '📦 Pickup' : '🏠 Delivery'} #${index + 1}
            </h4>
            <p style="margin: 0 0 4px 0; font-size: 14px;">${waypoint.address}</p>
            ${assignment ? `
              <div style="margin-top: 8px; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold; font-size: 12px;">#{assignment.tracking_number}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px;">${assignment.package_details?.description || 'Package delivery'}</p>
              </div>
            ` : ''}
          </div>
        `;

        L.marker([lat, lng], { icon: waypointIcon })
          .addTo(map)
          .bindPopup(popupContent);

        routeCoordinates.push([lat, lng]);
        bounds.extend([lat, lng]);
      });

      // Draw route line
      if (routeCoordinates.length > 1) {
        L.polyline(routeCoordinates, {
          color: '#3B82F6',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 5'
        }).addTo(map);
      }
    }

    // Add assignment markers if no route is provided
    if (!route && assignments.length > 0) {
      assignments.forEach((assignment, index) => {
        // Add pickup location
        if (assignment.pickup_location.latitude && assignment.pickup_location.longitude) {
          const pickupIcon = L.divIcon({
            html: `<div style="
              width: 20px;
              height: 20px;
              background: #10B981;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            className: 'pickup-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          L.marker([assignment.pickup_location.latitude, assignment.pickup_location.longitude], { icon: pickupIcon })
            .addTo(map)
            .bindPopup(`
              <div>
                <h4 style="margin: 0 0 8px 0;">📦 Pickup</h4>
                <p style="margin: 0;">${assignment.pickup_location.address}</p>
                <p style="margin: 4px 0 0 0; font-weight: bold;">#{assignment.tracking_number}</p>
              </div>
            `);

          bounds.extend([assignment.pickup_location.latitude, assignment.pickup_location.longitude]);
        }

        // Add delivery location
        if (assignment.delivery_location.latitude && assignment.delivery_location.longitude) {
          const deliveryIcon = L.divIcon({
            html: `<div style="
              width: 20px;
              height: 20px;
              background: #EF4444;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            className: 'delivery-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          L.marker([assignment.delivery_location.latitude, assignment.delivery_location.longitude], { icon: deliveryIcon })
            .addTo(map)
            .bindPopup(`
              <div>
                <h4 style="margin: 0 0 8px 0;">🏠 Delivery</h4>
                <p style="margin: 0;">${assignment.delivery_location.address}</p>
                <p style="margin: 4px 0 0 0; font-weight: bold;">#{assignment.tracking_number}</p>
              </div>
            `);

          bounds.extend([assignment.delivery_location.latitude, assignment.delivery_location.longitude]);
        }
      });
    }

    // Fit map to bounds if we have markers
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [currentLocation, route, assignments]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ height, width: '100%' }}
      className="rounded-lg overflow-hidden"
    />
  );
}