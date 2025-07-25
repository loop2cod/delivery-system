// Mock setup for Admin PWA specific features
const mockAdminDashboard = {
  metrics: {
    totalDeliveries: 1250,
    activeDrivers: 45,
    pendingInquiries: 12,
    deliverySuccessRate: 98.5
  },
  recentActivity: [
    { id: '1', type: 'delivery_completed', timestamp: Date.now() - 300000 },
    { id: '2', type: 'driver_assigned', timestamp: Date.now() - 600000 },
    { id: '3', type: 'inquiry_received', timestamp: Date.now() - 900000 }
  ]
};

const mockDriverManagement = {
  drivers: [
    {
      id: 'driver_1',
      name: 'Ahmed Al Mansouri',
      email: 'ahmed@driver.com',
      status: 'online',
      currentDeliveries: 3,
      rating: 4.8
    },
    {
      id: 'driver_2', 
      name: 'Mohammed bin Rashid',
      email: 'mohammed@driver.com',
      status: 'offline',
      currentDeliveries: 0,
      rating: 4.9
    }
  ]
};

// Global admin mocks
global.mockAdminData = {
  dashboard: mockAdminDashboard,
  drivers: mockDriverManagement
};