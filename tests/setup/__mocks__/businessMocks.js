// Mock setup for Business PWA specific features
const mockBusinessDashboard = {
  metrics: {
    totalRequests: 450,
    completedDeliveries: 425,
    pendingRequests: 15,
    averageDeliveryTime: 45
  },
  recentRequests: [
    { 
      id: 'req_1', 
      customer: 'Fatima Al Zahra',
      address: 'Dubai Marina',
      status: 'completed',
      timestamp: Date.now() - 600000 
    },
    { 
      id: 'req_2', 
      customer: 'Ali Hassan',
      address: 'JBR',
      status: 'in_transit',
      timestamp: Date.now() - 1200000 
    }
  ]
};

const mockServiceTypes = [
  {
    id: 'standard',
    name: 'Standard Delivery',
    price: 25,
    duration: '2-4 hours'
  },
  {
    id: 'express',
    name: 'Express Delivery', 
    price: 45,
    duration: '1-2 hours'
  },
  {
    id: 'same_day',
    name: 'Same Day Delivery',
    price: 35,
    duration: '4-8 hours'
  }
];

// Global business mocks
global.mockBusinessData = {
  dashboard: mockBusinessDashboard,
  serviceTypes: mockServiceTypes
};