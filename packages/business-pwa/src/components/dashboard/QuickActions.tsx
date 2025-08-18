'use client';

import {
  PlusIcon,
  DocumentTextIcon,
  TruckIcon,
  ChartBarIcon,
  UserGroupIcon,
  CreditCardIcon,
  ClockIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

const quickActions = [
  {
    name: 'New Delivery Request',
    description: 'Schedule a new delivery',
    icon: PlusIcon,
    href: '/requests/new',
    color: 'bg-primary hover:bg-primary/90',
    featured: true,
  },
  {
    name: 'Track Deliveries',
    description: 'View active deliveries',
    icon: MapPinIcon,
    href: '/deliveries',
    color: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    name: 'Request History',
    description: 'View past requests',
    icon: DocumentTextIcon,
    href: '/requests',
    color: 'bg-gray-600 hover:bg-gray-700',
  },
];

interface SummaryProps {
  activeDeliveries?: number;
  urgentDeliveries?: number;
  totalRequests?: number;
  monthlySpend?: number;
}

interface QuickActionsProps {
  onActionClick: (action: string) => void;
  summary?: SummaryProps;
}

export function QuickActions({ onActionClick, summary }: QuickActionsProps) {

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Quick Actions Grid */}
      <div className="lg:col-span-2">
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4 sm:mb-6">
            Quick Actions
          </h3>
          
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {quickActions.map((action) => (
              <button
                key={action.name}
                onClick={() => onActionClick(action.href)}
                className={`${action.color} ${
                  action.featured ? 'sm:col-span-2 lg:col-span-1' : ''
                } group relative rounded-lg p-3 sm:p-4 text-left text-white transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <action.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium">{action.name}</p>
                    <p className="text-xs text-white/80 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
                
                {action.featured && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                      Popular
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="lg:col-span-1">
        <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4 sm:mb-6">
            This Month Summary
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Active Deliveries</p>
                <p className="text-xs text-gray-500">In progress</p>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {summary?.activeDeliveries || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Urgent Items</p>
                <p className="text-xs text-gray-500">Need attention</p>
              </div>
              <span className="text-lg font-bold text-red-600">
                {summary?.urgentDeliveries || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Total Requests</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <span className="text-lg font-bold text-green-600">
                {summary?.totalRequests || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Monthly Spend</p>
                <p className="text-xs text-gray-500">AED</p>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {summary?.monthlySpend || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}