// Mock setup for Driver PWA specific features (GPS, camera, etc.)

// Mock MediaDevices for camera functionality
const mockMediaDevices = {
  getUserMedia: jest.fn(() => 
    Promise.resolve({
      getVideoTracks: () => [{ stop: jest.fn() }],
      getAudioTracks: () => [],
      getTracks: () => [{ stop: jest.fn() }]
    })
  ),
  enumerateDevices: jest.fn(() => 
    Promise.resolve([
      { 
        deviceId: 'camera1', 
        kind: 'videoinput', 
        label: 'Back Camera',
        groupId: 'group1' 
      }
    ])
  )
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  configurable: true
});

// Mock DeviceOrientationEvent for mobile compass
global.DeviceOrientationEvent = {
  requestPermission: jest.fn(() => Promise.resolve('granted'))
};

// Mock DeviceMotionEvent for accelerometer
global.DeviceMotionEvent = {
  requestPermission: jest.fn(() => Promise.resolve('granted'))
};

// Mock Notification API for push notifications
global.Notification = {
  permission: 'granted',
  requestPermission: jest.fn(() => Promise.resolve('granted'))
};

// Mock Vibration API for haptic feedback
global.navigator.vibrate = jest.fn();

// Mock Battery API for power management
Object.defineProperty(global.navigator, 'getBattery', {
  value: jest.fn(() => Promise.resolve({
    charging: false,
    level: 0.8,
    chargingTime: Infinity,
    dischargingTime: 14400,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  })),
  configurable: true
});

// Mock Screen Wake Lock API
Object.defineProperty(global.navigator, 'wakeLock', {
  value: {
    request: jest.fn(() => Promise.resolve({
      release: jest.fn(() => Promise.resolve()),
      released: false,
      type: 'screen'
    }))
  },
  configurable: true
});

// Mock delivery data for driver
const mockDriverDeliveries = [
  {
    id: 'del_1',
    tracking_number: 'TRK001',
    customer_name: 'Ahmed Al Mansouri',
    customer_phone: '+971501234567',
    pickup_address: 'Dubai Marina, Dubai, UAE',
    pickup_latitude: 25.080328,
    pickup_longitude: 55.139309,
    delivery_address: 'JBR, Dubai, UAE',
    delivery_latitude: 25.077363,
    delivery_longitude: 55.137245,
    service_type: 'express',
    status: 'assigned',
    estimated_duration: 45,
    priority: 'high'
  },
  {
    id: 'del_2',
    tracking_number: 'TRK002',
    customer_name: 'Fatima Al Zahra',
    customer_phone: '+971509876543',
    pickup_address: 'Business Bay, Dubai, UAE',
    pickup_latitude: 25.189623,
    pickup_longitude: 55.275590,
    delivery_address: 'Downtown Dubai, Dubai, UAE',
    delivery_latitude: 25.197197,
    delivery_longitude: 55.274376,
    service_type: 'standard',
    status: 'pending',
    estimated_duration: 60,
    priority: 'normal'
  }
];

// Global driver mocks
global.mockDriverData = {
  deliveries: mockDriverDeliveries,
  vehicle: {
    type: 'motorcycle',
    license_plate: 'DXB-12345',
    model: 'Honda PCX 150'
  },
  stats: {
    totalDeliveries: 234,
    completedToday: 8,
    rating: 4.9,
    onTimeRate: 96.5
  }
};