/**
 * Component tests for RouteOptimizer
 * Tests route optimization UI and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RouteOptimizer from '../RouteOptimizer';
import type { Delivery } from '@delivery-uae/shared/types';

// Mock the location services
jest.mock('@delivery-uae/shared/location-services', () => ({
  LocationServicesManager: jest.fn().mockImplementation(() => ({
    optimizeRoute: jest.fn(),
    calculateDistance: jest.fn(),
    isTracking: jest.fn(() => false)
  }))
}));

const mockDeliveries: Delivery[] = [
  testUtils.createMockDelivery({
    id: 'del1',
    tracking_number: 'TRK001',
    customer_name: 'Ahmed Al Mansouri',
    delivery_address: 'Dubai Marina, Dubai, UAE',
    delivery_latitude: 25.080328,
    delivery_longitude: 55.139309,
    service_type: 'express'
  }),
  testUtils.createMockDelivery({
    id: 'del2', 
    tracking_number: 'TRK002',
    customer_name: 'Fatima Al Zahra',
    delivery_address: 'Jumeirah Beach Residence, Dubai, UAE',
    delivery_latitude: 25.077363,
    delivery_longitude: 55.137245,
    service_type: 'standard'
  }),
  testUtils.createMockDelivery({
    id: 'del3',
    tracking_number: 'TRK003', 
    customer_name: 'Mohammed bin Rashid',
    delivery_address: 'Downtown Dubai, Dubai, UAE',
    delivery_latitude: 25.197197,
    delivery_longitude: 55.274376,
    service_type: 'express'
  })
];

describe('RouteOptimizer Component', () => {
  const mockOnRouteOptimized = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.mockGeolocation();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('renders route optimizer with delivery list', () => {
    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Route Optimizer')).toBeInTheDocument();
    expect(screen.getByText('3 deliveries pending optimization')).toBeInTheDocument();
    
    // Check if deliveries are displayed
    expect(screen.getByText('Ahmed Al Mansouri')).toBeInTheDocument();
    expect(screen.getByText('Fatima Al Zahra')).toBeInTheDocument();
    expect(screen.getByText('Mohammed bin Rashid')).toBeInTheDocument();
  });

  test('displays empty state when no deliveries', () => {
    render(
      <RouteOptimizer
        deliveries={[]}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('No deliveries to optimize')).toBeInTheDocument();
    expect(screen.getByText('Add deliveries to start route optimization')).toBeInTheDocument();
  });

  test('allows vehicle type selection', async () => {
    const user = userEvent.setup();
    
    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    const vehicleSelect = screen.getByLabelText('Vehicle Type');
    expect(vehicleSelect).toHaveValue('motorcycle');

    await user.selectOptions(vehicleSelect, 'van');
    expect(vehicleSelect).toHaveValue('van');

    await user.selectOptions(vehicleSelect, 'truck');
    expect(vehicleSelect).toHaveValue('truck');
  });

  test('allows optimization algorithm selection', async () => {
    const user = userEvent.setup();
    
    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    const algorithmSelect = screen.getByLabelText('Optimization Algorithm');
    expect(algorithmSelect).toHaveValue('nearest_neighbor');

    await user.selectOptions(algorithmSelect, 'genetic');
    expect(algorithmSelect).toHaveValue('genetic');
  });

  test('handles route optimization preferences', async () => {
    const user = userEvent.setup();
    
    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    // Toggle avoid tolls
    const avoidTollsCheckbox = screen.getByLabelText('Avoid Tolls');
    expect(avoidTollsCheckbox).not.toBeChecked();
    
    await user.click(avoidTollsCheckbox);
    expect(avoidTollsCheckbox).toBeChecked();

    // Toggle optimize for time
    const optimizeTimeCheckbox = screen.getByLabelText('Optimize for Time');
    expect(optimizeTimeCheckbox).toBeChecked(); // Default true
    
    await user.click(optimizeTimeCheckbox);
    expect(optimizeTimeCheckbox).not.toBeChecked();
  });

  test('allows delivery selection and deselection', async () => {
    const user = userEvent.setup();
    
    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    // All deliveries should be selected by default
    const checkboxes = screen.getAllByRole('checkbox');
    const deliveryCheckboxes = checkboxes.filter(cb => 
      cb.getAttribute('data-testid')?.startsWith('delivery-checkbox')
    );
    
    expect(deliveryCheckboxes).toHaveLength(3);
    deliveryCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });

    // Deselect first delivery
    await user.click(deliveryCheckboxes[0]);
    expect(deliveryCheckboxes[0]).not.toBeChecked();
    
    expect(screen.getByText('2 deliveries selected for optimization')).toBeInTheDocument();
  });

  test('shows priority deliveries with visual indicators', () => {
    const priorityDeliveries = [
      ...mockDeliveries,
      testUtils.createMockDelivery({
        id: 'priority1',
        service_type: 'express',
        priority: 'high'
      })
    ];

    render(
      <RouteOptimizer
        deliveries={priorityDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    // Express deliveries should have priority indicators
    const expressBadges = screen.getAllByText('EXPRESS');
    expect(expressBadges.length).toBeGreaterThan(0);
  });

  test('optimizes route successfully', async () => {
    const user = userEvent.setup();
    const mockOptimizedRoute = {
      deliveries: mockDeliveries,
      totalDistance: 25.7,
      estimatedDuration: 45,
      waypoints: [
        { latitude: 25.080328, longitude: 55.139309 },
        { latitude: 25.077363, longitude: 55.137245 },
        { latitude: 25.197197, longitude: 55.274376 }
      ]
    };

    // Mock successful optimization
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    mockInstance.optimizeRoute.mockResolvedValue({
      success: true,
      optimizedRoute: mockOptimizedRoute
    });

    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    const optimizeButton = screen.getByText('Optimize Route');
    await user.click(optimizeButton);

    // Should show loading state
    expect(screen.getByText('Optimizing route...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockOnRouteOptimized).toHaveBeenCalledWith(mockOptimizedRoute);
    });
  });

  test('handles optimization error', async () => {
    const user = userEvent.setup();
    
    // Mock optimization failure
    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    mockInstance.optimizeRoute.mockResolvedValue({
      success: false,
      error: 'GPS location unavailable'
    });

    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    const optimizeButton = screen.getByText('Optimize Route');
    await user.click(optimizeButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('GPS location unavailable');
    });

    // Should show error message
    expect(screen.getByText('Route optimization failed')).toBeInTheDocument();
  });

  test('displays route statistics after optimization', async () => {
    const user = userEvent.setup();
    const mockOptimizedRoute = {
      deliveries: mockDeliveries,
      totalDistance: 25.7,
      estimatedDuration: 45,
      waypoints: []
    };

    const LocationServicesManager = require('@delivery-uae/shared/location-services').LocationServicesManager;
    const mockInstance = new LocationServicesManager();
    mockInstance.optimizeRoute.mockResolvedValue({
      success: true,
      optimizedRoute: mockOptimizedRoute
    });

    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    const optimizeButton = screen.getByText('Optimize Route');
    await user.click(optimizeButton);

    await waitFor(() => {
      expect(screen.getByText('25.7 km')).toBeInTheDocument();
      expect(screen.getByText('45 min')).toBeInTheDocument();
      expect(screen.getByText('3 stops')).toBeInTheDocument();
    });
  });

  test('allows manual reordering of deliveries', async () => {
    const user = userEvent.setup();
    
    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    // Switch to manual reordering mode
    const manualButton = screen.getByText('Manual Reorder');
    await user.click(manualButton);

    // Should show drag handles and reorder controls
    expect(screen.getAllByTestId('drag-handle')).toHaveLength(3);
    expect(screen.getByText('Drag to reorder deliveries')).toBeInTheDocument();
  });

  test('respects delivery time windows', () => {
    const timeWindowDeliveries = [
      testUtils.createMockDelivery({
        id: 'morning',
        delivery_time_window: '09:00-12:00',
        priority: 'high'
      }),
      testUtils.createMockDelivery({
        id: 'afternoon', 
        delivery_time_window: '14:00-17:00',
        priority: 'normal'
      })
    ];

    render(
      <RouteOptimizer
        deliveries={timeWindowDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('09:00-12:00')).toBeInTheDocument();
    expect(screen.getByText('14:00-17:00')).toBeInTheDocument();
  });

  test('handles geolocation permission request', async () => {
    const user = userEvent.setup();
    
    // Mock geolocation permission denied
    testUtils.mockGeolocation({
      getCurrentPosition: jest.fn((success, error) => {
        error({ code: 1, message: 'Permission denied' });
      })
    });

    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    const optimizeButton = screen.getByText('Optimize Route');
    await user.click(optimizeButton);

    await waitFor(() => {
      expect(screen.getByText('Location permission required')).toBeInTheDocument();
    });

    // Should show permission request button
    const requestPermissionButton = screen.getByText('Enable Location');
    expect(requestPermissionButton).toBeInTheDocument();
  });

  test('applies UAE brand theme correctly', () => {
    const { container } = render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    // Check for UAE theme colors
    const optimizeButton = screen.getByText('Optimize Route');
    expect(optimizeButton).toHaveClass('bg-uae-navy');
    
    const expressBadges = screen.getAllByText('EXPRESS');
    expressBadges.forEach(badge => {
      expect(badge).toHaveClass('bg-uae-red');
    });
  });

  test('is accessible with proper ARIA labels', () => {
    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Route Optimization');
    expect(screen.getByRole('button', { name: 'Optimize Route' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Vehicle Type' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Delivery List' })).toBeInTheDocument();
  });

  test('handles touch gestures on mobile', async () => {
    // Mock touch events
    const user = userEvent.setup();
    
    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    const deliveryItem = screen.getByTestId('delivery-item-del1');
    
    // Simulate swipe gesture
    fireEvent.touchStart(deliveryItem, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchMove(deliveryItem, {
      touches: [{ clientX: 200, clientY: 100 }]
    });
    
    fireEvent.touchEnd(deliveryItem);

    // Should reveal swipe actions
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  test('persists preferences in localStorage', async () => {
    const user = userEvent.setup();
    testUtils.mockLocalStorage();
    
    render(
      <RouteOptimizer
        deliveries={mockDeliveries}
        onRouteOptimized={mockOnRouteOptimized}
        onError={mockOnError}
      />
    );

    // Change vehicle type
    const vehicleSelect = screen.getByLabelText('Vehicle Type');
    await user.selectOptions(vehicleSelect, 'van');

    // Toggle avoid tolls
    const avoidTollsCheckbox = screen.getByLabelText('Avoid Tolls');
    await user.click(avoidTollsCheckbox);

    expect(global.localStorage.setItem).toHaveBeenCalledWith(
      'route_optimizer_preferences',
      expect.stringContaining('"vehicleType":"van"')
    );
  });
});