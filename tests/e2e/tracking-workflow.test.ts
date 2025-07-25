/**
 * End-to-end tests for complete GPS tracking workflow
 * Tests the full user journey from starting tracking to completing deliveries
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { chromium } from 'playwright';

test.describe('GPS Tracking Workflow E2E', () => {
  let context: BrowserContext;
  let driverPage: Page;
  let adminPage: Page;

  test.beforeAll(async () => {
    // Launch browser with geolocation permissions
    context = await chromium.launchPersistentContext('', {
      headless: false,
      permissions: ['geolocation'],
      geolocation: { latitude: 25.276987, longitude: 55.296249 }, // Dubai coordinates
      viewport: { width: 375, height: 812 } // Mobile viewport
    });

    driverPage = await context.newPage();
    adminPage = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Complete delivery tracking workflow', async () => {
    // Step 1: Admin creates and assigns delivery
    await adminPage.goto('http://localhost:3002'); // Admin PWA
    
    // Login as admin
    await adminPage.fill('[data-testid="email-input"]', 'admin@test.com');
    await adminPage.fill('[data-testid="password-input"]', 'password123');
    await adminPage.click('[data-testid="login-button"]');
    
    await expect(adminPage.locator('[data-testid="admin-dashboard"]')).toBeVisible();

    // Create new delivery
    await adminPage.click('[data-testid="create-delivery-button"]');
    await adminPage.fill('[data-testid="customer-name"]', 'Ahmed Al Mansouri');
    await adminPage.fill('[data-testid="customer-phone"]', '+971501234567');
    await adminPage.fill('[data-testid="pickup-address"]', 'Dubai Marina, Dubai, UAE');
    await adminPage.fill('[data-testid="delivery-address"]', 'Jumeirah Beach Residence, Dubai, UAE');
    await adminPage.selectOption('[data-testid="service-type"]', 'express');
    await adminPage.click('[data-testid="save-delivery-button"]');

    // Get delivery ID for reference
    const deliveryId = await adminPage.textContent('[data-testid="delivery-id"]');
    expect(deliveryId).toBeTruthy();

    // Assign delivery to driver
    await adminPage.click('[data-testid="assign-driver-button"]');
    await adminPage.selectOption('[data-testid="driver-select"]', 'driver@test.com');
    await adminPage.click('[data-testid="confirm-assignment-button"]');

    await expect(adminPage.locator('[data-testid="assignment-success"]')).toBeVisible();

    // Step 2: Driver receives and accepts delivery
    await driverPage.goto('http://localhost:3004'); // Driver PWA
    
    // Login as driver
    await driverPage.fill('[data-testid="email-input"]', 'driver@test.com');
    await driverPage.fill('[data-testid="password-input"]', 'password123');
    await driverPage.click('[data-testid="login-button"]');

    await expect(driverPage.locator('[data-testid="driver-dashboard"]')).toBeVisible();

    // Check for new delivery notification
    await expect(driverPage.locator('[data-testid="new-delivery-notification"]')).toBeVisible();
    
    // View delivery details
    await driverPage.click(`[data-testid="delivery-card-${deliveryId}"]`);
    await expect(driverPage.locator('[data-testid="delivery-details"]')).toBeVisible();
    
    // Accept delivery
    await driverPage.click('[data-testid="accept-delivery-button"]');
    await expect(driverPage.locator('[data-testid="delivery-accepted"]')).toBeVisible();

    // Step 3: Driver starts GPS tracking
    await driverPage.click('[data-testid="start-delivery-button"]');
    await expect(driverPage.locator('[data-testid="tracking-page"]')).toBeVisible();

    // Start GPS tracking
    await driverPage.click('[data-testid="start-tracking-button"]');
    
    // Handle geolocation permission if prompted
    await driverPage.waitForSelector('[data-testid="tracking-active"]', { timeout: 10000 });
    await expect(driverPage.locator('[data-testid="tracking-status"]')).toContainText('Active');

    // Verify location is displayed
    await expect(driverPage.locator('[data-testid="current-location"]')).toBeVisible();
    await expect(driverPage.locator('[data-testid="gps-accuracy"]')).toBeVisible();

    // Step 4: Optimize delivery route
    await driverPage.click('[data-testid="route-optimizer-tab"]');
    await expect(driverPage.locator('[data-testid="route-optimizer"]')).toBeVisible();

    // Select vehicle type
    await driverPage.selectOption('[data-testid="vehicle-type-select"]', 'motorcycle');
    
    // Optimize route
    await driverPage.click('[data-testid="optimize-route-button"]');
    await driverPage.waitForSelector('[data-testid="route-optimized"]', { timeout: 15000 });

    // Verify optimized route is displayed
    await expect(driverPage.locator('[data-testid="route-statistics"]')).toBeVisible();
    await expect(driverPage.locator('[data-testid="total-distance"]')).toBeVisible();
    await expect(driverPage.locator('[data-testid="estimated-duration"]')).toBeVisible();

    // Step 5: Navigate to pickup location
    await driverPage.click('[data-testid="start-navigation-button"]');
    await expect(driverPage.locator('[data-testid="navigation-active"]')).toBeVisible();

    // Simulate movement towards pickup location
    await driverPage.evaluate(() => {
      // Mock geolocation to simulate movement
      const originalGeolocation = navigator.geolocation;
      navigator.geolocation = {
        ...originalGeolocation,
        getCurrentPosition: (success) => {
          success({
            coords: {
              latitude: 25.080328, // Near pickup location
              longitude: 55.139309,
              accuracy: 8,
              altitude: null,
              altitudeAccuracy: null,
              heading: 180,
              speed: 25
            },
            timestamp: Date.now()
          });
        }
      };
    });

    // Wait for geofence detection at pickup
    await driverPage.waitForSelector('[data-testid="pickup-geofence-entered"]', { timeout: 30000 });
    await expect(driverPage.locator('[data-testid="pickup-notification"]')).toContainText('Arrived at pickup location');

    // Step 6: Scan package QR code at pickup
    await driverPage.click('[data-testid="scan-package-button"]');
    await expect(driverPage.locator('[data-testid="qr-scanner"]')).toBeVisible();

    // Simulate QR code scan
    await driverPage.click('[data-testid="simulate-scan-button"]'); // Test helper
    await driverPage.fill('[data-testid="qr-data-input"]', JSON.stringify({
      type: 'package',
      id: `package_${deliveryId}`,
      timestamp: Date.now()
    }));
    await driverPage.click('[data-testid="confirm-scan-button"]');

    await expect(driverPage.locator('[data-testid="package-scanned"]')).toBeVisible();

    // Confirm pickup
    await driverPage.click('[data-testid="confirm-pickup-button"]');
    await expect(driverPage.locator('[data-testid="pickup-confirmed"]')).toBeVisible();

    // Step 7: Navigate to delivery location
    await driverPage.click('[data-testid="navigate-to-delivery-button"]');
    
    // Simulate movement towards delivery location
    await driverPage.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: 25.077363, // Near delivery location
            longitude: 55.137245,
            accuracy: 8,
            altitude: null,
            altitudeAccuracy: null,
            heading: 90,
            speed: 30
          },
          timestamp: Date.now()
        });
      };
    });

    // Wait for arrival at delivery location
    await driverPage.waitForSelector('[data-testid="delivery-geofence-entered"]', { timeout: 30000 });
    await expect(driverPage.locator('[data-testid="delivery-notification"]')).toContainText('Arrived at delivery location');

    // Step 8: Complete delivery with photo confirmation
    await driverPage.click('[data-testid="complete-delivery-button"]');
    await expect(driverPage.locator('[data-testid="delivery-completion"]')).toBeVisible();

    // Take delivery photo
    await driverPage.click('[data-testid="take-photo-button"]');
    await driverPage.waitForSelector('[data-testid="camera-interface"]');
    await driverPage.click('[data-testid="capture-button"]');
    await expect(driverPage.locator('[data-testid="photo-captured"]')).toBeVisible();

    // Get customer signature (or delivery confirmation)
    await driverPage.fill('[data-testid="recipient-name"]', 'Ahmed Al Mansouri');
    await driverPage.click('[data-testid="signature-pad"]'); // Simulate signature
    await driverPage.click('[data-testid="confirm-signature-button"]');

    // Add delivery notes
    await driverPage.fill('[data-testid="delivery-notes"]', 'Package delivered to recipient at front door. All items in good condition.');

    // Final delivery confirmation
    await driverPage.click('[data-testid="final-confirm-button"]');
    await expect(driverPage.locator('[data-testid="delivery-completed"]')).toBeVisible();

    // Verify delivery status updated
    await expect(driverPage.locator('[data-testid="delivery-status"]')).toContainText('Delivered');

    // Step 9: Stop GPS tracking
    await driverPage.click('[data-testid="tracking-tab"]');
    await driverPage.click('[data-testid="stop-tracking-button"]');
    await expect(driverPage.locator('[data-testid="tracking-status"]')).toContainText('Stopped');

    // Step 10: Verify real-time updates in admin dashboard
    await adminPage.reload();
    await adminPage.waitForLoadState('networkidle');

    // Check delivery status in admin dashboard
    await adminPage.click(`[data-testid="delivery-row-${deliveryId}"]`);
    await expect(adminPage.locator('[data-testid="delivery-status-badge"]')).toContainText('Delivered');

    // Verify tracking history is available
    await adminPage.click('[data-testid="view-tracking-history"]');
    await expect(adminPage.locator('[data-testid="location-history"]')).toBeVisible();
    
    // Should show multiple location points
    const locationPoints = adminPage.locator('[data-testid="location-point"]');
    await expect(locationPoints).toHaveCount.greaterThan(5);

    // Verify delivery photos and signature
    await adminPage.click('[data-testid="view-delivery-proof"]');
    await expect(adminPage.locator('[data-testid="delivery-photo"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="customer-signature"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="delivery-notes"]')).toContainText('Package delivered to recipient');

    // Step 11: Verify analytics and metrics
    await adminPage.click('[data-testid="analytics-tab"]');
    await expect(adminPage.locator('[data-testid="delivery-metrics"]')).toBeVisible();

    // Check delivery time metrics
    await expect(adminPage.locator('[data-testid="average-delivery-time"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="delivery-success-rate"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="driver-performance"]')).toBeVisible();
  });

  test('GPS tracking with offline scenarios', async () => {
    await driverPage.goto('http://localhost:3004');
    
    // Login as driver
    await driverPage.fill('[data-testid="email-input"]', 'driver@test.com');
    await driverPage.fill('[data-testid="password-input"]', 'password123');
    await driverPage.click('[data-testid="login-button"]');

    // Start tracking
    await driverPage.click('[data-testid="tracking"]');
    await driverPage.click('[data-testid="start-tracking-button"]');
    await driverPage.waitForSelector('[data-testid="tracking-active"]');

    // Simulate going offline
    await driverPage.context().setOffline(true);
    await expect(driverPage.locator('[data-testid="offline-indicator"]')).toBeVisible();

    // Continue tracking offline
    await driverPage.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: 25.280000,
            longitude: 55.300000,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: 45,
            speed: 20
          },
          timestamp: Date.now()
        });
      };
    });

    // Verify offline tracking continues
    await expect(driverPage.locator('[data-testid="offline-tracking-active"]')).toBeVisible();
    await expect(driverPage.locator('[data-testid="queued-updates"]')).toContainText('3 locations queued');

    // Go back online
    await driverPage.context().setOffline(false);
    await expect(driverPage.locator('[data-testid="online-indicator"]')).toBeVisible();

    // Verify data synchronization
    await driverPage.waitForSelector('[data-testid="sync-complete"]', { timeout: 15000 });
    await expect(driverPage.locator('[data-testid="queued-updates"]')).toContainText('0 locations queued');
  });

  test('Multiple delivery route optimization', async () => {
    // Setup multiple deliveries for optimization testing
    await adminPage.goto('http://localhost:3002');
    
    // Create 5 test deliveries
    const deliveryAddresses = [
      'Dubai Marina, Dubai, UAE',
      'Downtown Dubai, Dubai, UAE', 
      'Jumeirah Beach Residence, Dubai, UAE',
      'Business Bay, Dubai, UAE',
      'DIFC, Dubai, UAE'
    ];

    const deliveryIds = [];
    
    for (const address of deliveryAddresses) {
      await adminPage.click('[data-testid="create-delivery-button"]');
      await adminPage.fill('[data-testid="customer-name"]', `Customer ${deliveryIds.length + 1}`);
      await adminPage.fill('[data-testid="delivery-address"]', address);
      await adminPage.selectOption('[data-testid="service-type"]', 'standard');
      await adminPage.click('[data-testid="save-delivery-button"]');
      
      const deliveryId = await adminPage.textContent('[data-testid="delivery-id"]');
      deliveryIds.push(deliveryId);
      
      // Assign to driver
      await adminPage.click('[data-testid="assign-driver-button"]');
      await adminPage.selectOption('[data-testid="driver-select"]', 'driver@test.com');
      await adminPage.click('[data-testid="confirm-assignment-button"]');
    }

    // Switch to driver app
    await driverPage.goto('http://localhost:3004');
    await driverPage.click('[data-testid="route-optimizer"]');

    // Verify all deliveries are listed
    await expect(driverPage.locator('[data-testid="delivery-list"] .delivery-item')).toHaveCount(5);

    // Test different optimization algorithms
    await driverPage.selectOption('[data-testid="algorithm-select"]', 'nearest_neighbor');
    await driverPage.click('[data-testid="optimize-route-button"]');
    
    await driverPage.waitForSelector('[data-testid="route-optimized"]');
    const nearestNeighborDistance = await driverPage.textContent('[data-testid="total-distance"]');

    // Try genetic algorithm
    await driverPage.selectOption('[data-testid="algorithm-select"]', 'genetic');
    await driverPage.click('[data-testid="optimize-route-button"]');
    
    await driverPage.waitForSelector('[data-testid="route-optimized"]');
    const geneticDistance = await driverPage.textContent('[data-testid="total-distance"]');

    // Genetic algorithm should provide better optimization for larger routes
    expect(parseFloat(geneticDistance)).toBeLessThanOrEqual(parseFloat(nearestNeighborDistance) * 1.1);

    // Test manual reordering
    await driverPage.click('[data-testid="manual-reorder-button"]');
    await expect(driverPage.locator('[data-testid="drag-handle"]')).toHaveCount(5);

    // Simulate drag and drop reordering
    const firstDelivery = driverPage.locator('[data-testid="delivery-item"]').first();
    const lastDelivery = driverPage.locator('[data-testid="delivery-item"]').last();
    
    await firstDelivery.dragTo(lastDelivery);
    await expect(driverPage.locator('[data-testid="route-modified"]')).toBeVisible();
  });

  test('Geofence event handling', async () => {
    await driverPage.goto('http://localhost:3004');
    
    // Start tracking with geofence monitoring
    await driverPage.click('[data-testid="tracking"]');
    await driverPage.click('[data-testid="start-tracking-button"]');
    await driverPage.check('[data-testid="enable-geofencing"]');

    // Create a delivery geofence
    await driverPage.click('[data-testid="create-geofence-button"]');
    await driverPage.fill('[data-testid="geofence-name"]', 'Test Delivery Zone');
    await driverPage.fill('[data-testid="geofence-radius"]', '100');
    await driverPage.check('[data-testid="geofence-enter-event"]');
    await driverPage.check('[data-testid="geofence-exit-event"]');
    await driverPage.click('[data-testid="save-geofence-button"]');

    await expect(driverPage.locator('[data-testid="geofence-created"]')).toBeVisible();

    // Simulate entering geofence
    await driverPage.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: 25.276990, // Inside geofence
            longitude: 55.296250,
            accuracy: 5,
            altitude: null,
            altitudeAccuracy: null,
            heading: 0,
            speed: 0
          },
          timestamp: Date.now()
        });
      };
    });

    // Wait for geofence entry event
    await driverPage.waitForSelector('[data-testid="geofence-enter-notification"]', { timeout: 10000 });
    await expect(driverPage.locator('[data-testid="geofence-event-log"]')).toContainText('Entered: Test Delivery Zone');

    // Simulate exiting geofence
    await driverPage.evaluate(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: 25.280000, // Outside geofence
            longitude: 55.300000,
            accuracy: 5,
            altitude: null,
            altitudeAccuracy: null,
            heading: 90,
            speed: 25
          },
          timestamp: Date.now()
        });
      };
    });

    // Wait for geofence exit event
    await driverPage.waitForSelector('[data-testid="geofence-exit-notification"]', { timeout: 10000 });
    await expect(driverPage.locator('[data-testid="geofence-event-log"]')).toContainText('Exited: Test Delivery Zone');

    // Verify events are recorded in history
    await driverPage.click('[data-testid="view-geofence-history"]');
    await expect(driverPage.locator('[data-testid="geofence-history-list"] .event-item')).toHaveCount.greaterThanOrEqual(2);
  });

  test('Battery optimization and background tracking', async () => {
    await driverPage.goto('http://localhost:3004');
    
    // Enable battery optimization
    await driverPage.click('[data-testid="tracking-settings"]');
    await driverPage.check('[data-testid="battery-optimization"]');
    await driverPage.selectOption('[data-testid="tracking-frequency"]', 'adaptive');
    await driverPage.click('[data-testid="save-settings"]');

    // Start tracking
    await driverPage.click('[data-testid="start-tracking-button"]');
    await expect(driverPage.locator('[data-testid="battery-optimized-tracking"]')).toBeVisible();

    // Simulate low battery scenario
    await driverPage.evaluate(() => {
      Object.defineProperty(navigator, 'battery', {
        value: {
          level: 0.15, // 15% battery
          charging: false
        }
      });
    });

    // Should automatically adjust tracking frequency
    await expect(driverPage.locator('[data-testid="low-battery-mode"]')).toBeVisible();
    await expect(driverPage.locator('[data-testid="tracking-interval"]')).toContainText('60 seconds');

    // Test background tracking
    await driverPage.check('[data-testid="background-tracking"]');
    
    // Simulate app going to background
    await driverPage.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { value: true });
    });

    await expect(driverPage.locator('[data-testid="background-tracking-active"]')).toBeVisible();

    // Simulate returning to foreground
    await driverPage.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(driverPage.locator('[data-testid="foreground-tracking-resumed"]')).toBeVisible();
  });
});