/**
 * Component tests for LiveTracking
 * Tests real-time GPS tracking UI and functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LiveTracking from '../LiveTracking';
import type { LocationCoordinate, GeofenceEvent } from '@delivery-uae/shared/types';

// Mock WebSocket
const mockWebSocket = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock the location services
jest.mock('@delivery-uae/shared/location-services', () => ({
  LocationServicesManager: jest.fn().mockImplementation(() => ({
    startTracking: jest.fn(),
    stopTracking: jest.fn(),
    isTracking: jest.fn(() => false),
    getLastKnownLocation: jest.fn(),
    createGeofence: jest.fn(),
    removeGeofence: jest.fn(),
    enableBackgroundTracking: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
}));

describe('LiveTracking Component', () => {
  const mockOnLocationUpdate = jest.fn();
  const mockOnGeofenceEvent = jest.fn();
  const mockOnError = jest.fn();
  const mockDeliveryId = 'delivery_123';

  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.mockGeolocation();
    testUtils.mockLocalStorage();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('renders live tracking interface', () => {
    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Live GPS Tracking')).toBeInTheDocument();
    expect(screen.getByText('Start Tracking')).toBeInTheDocument();
    expect(screen.getByText('Tracking Status: Stopped')).toBeInTheDocument();
  });

  test('starts GPS tracking successfully', async () => {
    const user = userEvent.setup();
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    
    mockInstance.startTracking.mockResolvedValue({
      success: true,
      location: testUtils.createMockLocation()
    });
    
    mockInstance.isTracking.mockReturnValue(true);

    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    const startButton = screen.getByText('Start Tracking');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Stop Tracking')).toBeInTheDocument();
      expect(screen.getByText('Tracking Status: Active')).toBeInTheDocument();
    });

    expect(mockInstance.startTracking).toHaveBeenCalledWith({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000
    });
  });

  test('handles GPS permission denied', async () => {
    const user = userEvent.setup();
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    
    mockInstance.startTracking.mockResolvedValue({
      success: false,
      error: 'GPS permission denied'
    });

    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    const startButton = screen.getByText('Start Tracking');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Location permission required')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith('GPS permission denied');
    });
  });

  test('displays current location information', async () => {
    const user = userEvent.setup();
    const mockLocation = testUtils.createMockLocation({
      latitude: 25.276987,
      longitude: 55.296249,
      accuracy: 8
    });

    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    
    mockInstance.startTracking.mockResolvedValue({
      success: true,
      location: mockLocation
    });
    
    mockInstance.getLastKnownLocation.mockReturnValue(mockLocation);
    mockInstance.isTracking.mockReturnValue(true);

    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    const startButton = screen.getByText('Start Tracking');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('25.276987, 55.296249')).toBeInTheDocument();
      expect(screen.getByText('Accuracy: 8m')).toBeInTheDocument();
    });

    expect(mockOnLocationUpdate).toHaveBeenCalledWith(mockLocation);
  });

  test('shows GPS accuracy indicator', async () => {
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    
    // High accuracy location
    const highAccuracyLocation = testUtils.createMockLocation({ accuracy: 3 });
    mockInstance.getLastKnownLocation.mockReturnValue(highAccuracyLocation);
    mockInstance.isTracking.mockReturnValue(true);

    const { rerender } = render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    expect(screen.getByTestId('accuracy-indicator')).toHaveClass('bg-green-500');

    // Low accuracy location
    const lowAccuracyLocation = testUtils.createMockLocation({ accuracy: 25 });
    mockInstance.getLastKnownLocation.mockReturnValue(lowAccuracyLocation);

    rerender(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    expect(screen.getByTestId('accuracy-indicator')).toHaveClass('bg-red-500');
  });

  test('displays battery optimization status', () => {
    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
        enableBatteryOptimization={true}
      />
    );

    expect(screen.getByText('Battery Optimization: Enabled')).toBeInTheDocument();
    expect(screen.getByTestId('battery-icon')).toHaveClass('text-green-600');
  });

  test('handles connection status changes', async () => {
    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    // Simulate online/offline events
    act(() => {
      fireEvent(window, new Event('offline'));
    });

    expect(screen.getByText('Connection: Offline')).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-red-500');

    act(() => {
      fireEvent(window, new Event('online'));
    });

    expect(screen.getByText('Connection: Online')).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-green-500');
  });

  test('handles geofence events correctly', async () => {
    const user = userEvent.setup();
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    
    let geofenceHandler: (event: GeofenceEvent) => void;
    mockInstance.on.mockImplementation((event: string, handler: any) => {
      if (event === 'geofence') {
        geofenceHandler = handler;
      }
    });

    mockInstance.startTracking.mockResolvedValue({ success: true });
    mockInstance.isTracking.mockReturnValue(true);

    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    const startButton = screen.getByText('Start Tracking');
    await user.click(startButton);

    // Simulate geofence entry event
    const geofenceEvent: GeofenceEvent = {
      geofenceId: 'delivery-zone',
      eventType: 'enter',
      location: testUtils.createMockLocation(),
      timestamp: Date.now()
    };

    act(() => {
      geofenceHandler!(geofenceEvent);
    });

    expect(mockOnGeofenceEvent).toHaveBeenCalledWith(geofenceEvent);
    expect(screen.getByText('Entered delivery zone')).toBeInTheDocument();
  });

  test('shows tracking duration', async () => {
    const user = userEvent.setup();
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    
    mockInstance.startTracking.mockResolvedValue({ success: true });
    mockInstance.isTracking.mockReturnValue(true);

    jest.useFakeTimers();

    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    const startButton = screen.getByText('Start Tracking');
    await user.click(startButton);

    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(screen.getByText('Duration: 00:30')).toBeInTheDocument();

    jest.useRealTimers();
  });

  test('handles server synchronization', async () => {
    const user = userEvent.setup();
    testUtils.mockFetch({
      'POST /api/driver/location': testUtils.mockAPIResponse({ success: true })
    });

    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    
    mockInstance.startTracking.mockResolvedValue({ success: true });
    mockInstance.isTracking.mockReturnValue(true);

    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    const startButton = screen.getByText('Start Tracking');
    await user.click(startButton);

    // Should attempt to sync location updates
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/driver/location'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  test('enables background tracking', async () => {
    const user = userEvent.setup();
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    
    mockInstance.enableBackgroundTracking.mockResolvedValue({ success: true });

    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    const backgroundTrackingToggle = screen.getByLabelText('Enable Background Tracking');
    await user.click(backgroundTrackingToggle);

    expect(mockInstance.enableBackgroundTracking).toHaveBeenCalledWith({
      interval: 30000,
      distanceFilter: 10,
      saveToStorage: true
    });
  });

  test('displays tracking statistics', async () => {
    const user = userEvent.setup();
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    
    // Mock multiple location updates
    const locations = [
      testUtils.createMockLocation({ timestamp: Date.now() - 60000 }),
      testUtils.createMockLocation({ timestamp: Date.now() - 30000 }),
      testUtils.createMockLocation({ timestamp: Date.now() })
    ];

    mockInstance.startTracking.mockResolvedValue({ success: true });
    mockInstance.isTracking.mockReturnValue(true);

    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
        showStatistics={true}
      />
    );

    const startButton = screen.getByText('Start Tracking');
    await user.click(startButton);

    // Simulate location updates
    locations.forEach((location, index) => {
      act(() => {
        mockOnLocationUpdate(location);
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Location Updates: 3')).toBeInTheDocument();
      expect(screen.getByText(/Average Accuracy:/)).toBeInTheDocument();
    });
  });

  test('handles pause and resume tracking', async () => {
    const user = userEvent.setup();
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    
    mockInstance.startTracking.mockResolvedValue({ success: true });
    mockInstance.isTracking.mockReturnValue(true);

    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    // Start tracking
    const startButton = screen.getByText('Start Tracking');
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Pause Tracking')).toBeInTheDocument();
    });

    // Pause tracking
    const pauseButton = screen.getByText('Pause Tracking');
    await user.click(pauseButton);

    expect(screen.getByText('Resume Tracking')).toBeInTheDocument();
    expect(screen.getByText('Tracking Status: Paused')).toBeInTheDocument();

    // Resume tracking
    const resumeButton = screen.getByText('Resume Tracking');
    await user.click(resumeButton);

    expect(screen.getByText('Pause Tracking')).toBeInTheDocument();
    expect(screen.getByText('Tracking Status: Active')).toBeInTheDocument();
  });

  test('applies UAE brand theme correctly', () => {
    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    const startButton = screen.getByText('Start Tracking');
    expect(startButton).toHaveClass('bg-uae-navy');

    const trackingCard = screen.getByTestId('tracking-card');
    expect(trackingCard).toHaveClass('border-uae-light');
  });

  test('is accessible with proper ARIA labels', () => {
    render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    expect(screen.getByRole('region', { name: 'GPS Tracking Controls' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start GPS Tracking' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Tracking Status' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Location Information' })).toBeInTheDocument();
  });

  test('handles cleanup on unmount', () => {
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();

    const { unmount } = render(
      <LiveTracking
        deliveryId={mockDeliveryId}
        onLocationUpdate={mockOnLocationUpdate}
        onGeofenceEvent={mockOnGeofenceEvent}
        onError={mockOnError}
      />
    );

    unmount();

    expect(mockInstance.stopTracking).toHaveBeenCalled();
    expect(mockInstance.off).toHaveBeenCalledWith('geofence', expect.any(Function));
  });
});