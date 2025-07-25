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
  {
    name: 'Billing Dashboard',
    description: 'Manage invoices',
    icon: CreditCardIcon,
    href: '/billing',
    color: 'bg-green-600 hover:bg-green-700',
  },
  {
    name: 'Team Management',
    description: 'Manage team access',
    icon: UserGroupIcon,
    href: '/team',
    color: 'bg-purple-600 hover:bg-purple-700',
  },
  {
    name: 'Analytics Report',
    description: 'View detailed reports',
    icon: ChartBarIcon,
    href: '/reports',
    color: 'bg-accent hover:bg-accent/90',
  },
];

const urgentActions = [
  {
    id: 1,
    title: 'Urgent Delivery',
    description: 'Contract needs to be delivered to DIFC by 5 PM',
    action: 'Assign Driver',
    priority: 'urgent',
    time: '2 hours left',
  },
  {
    id: 2,
    title: 'Payment Overdue',
    description: 'Invoice #INV-2024-015 is 5 days overdue',
    action: 'Process Payment',
    priority: 'high',
    time: '5 days',
  },
  {
    id: 3,
    title: 'Team Member Request',
    description: 'Sarah Johnson needs access to billing section',
    action: 'Grant Access',
    priority: 'medium',
    time: '1 day ago',
  },
];

interface QuickActionsProps {
  onActionClick: (action: string) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
  const handleUrgentAction = (actionId: number, actionType: string) => {
    console.log(`Handling urgent action ${actionId}: ${actionType}`);
    onActionClick(`urgent-${actionId}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quick Actions Grid */}
      <div className="lg:col-span-2">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Quick Actions
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.name}
                onClick={() => onActionClick(action.href)}
                className={`${action.color} ${
                  action.featured ? 'sm:col-span-2 lg:col-span-1' : ''
                } group relative rounded-lg p-4 text-left text-white transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <action.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.name}</p>
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

      {/* Urgent Actions */}
      <div className="lg:col-span-1">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Requires Attention
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {urgentActions.length} items
            </span>
          </div>
          
          <div className="space-y-4">
            {urgentActions.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {item.title}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {item.time}
                      </span>
                      <button
                        onClick={() => handleUrgentAction(item.id, item.action)}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        {item.action}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => onActionClick('/notifications')}
              className="w-full text-sm font-medium text-primary hover:text-primary/80"
            >
              View all notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}