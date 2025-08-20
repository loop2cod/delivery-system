'use client';

import { 
  InboxIcon, 
  TruckIcon, 
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface StatsCard {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: any;
  color: string;
}

const stats: StatsCard[] = [
  {
    name: 'New Inquiries',
    value: '24',
    change: '+12%',
    changeType: 'increase',
    icon: InboxIcon,
    color: 'bg-blue-500',
  },
  {
    name: 'Active Deliveries',
    value: '156',
    change: '+3%',
    changeType: 'increase',
    icon: TruckIcon,
    color: 'bg-primary',
  },
  {
    name: 'Completed Today',
    value: '89',
    change: '+18%',
    changeType: 'increase',
    icon: CheckCircleIcon,
    color: 'bg-green-500',
  },
  {
    name: 'Pending Assignments',
    value: '12',
    change: '-5%',
    changeType: 'decrease',
    icon: ClockIcon,
    color: 'bg-yellow-500',
  },
  {
    name: 'Urgent Deliveries',
    value: '7',
    change: '+2',
    changeType: 'increase',
    icon: ExclamationTriangleIcon,
    color: 'bg-accent',
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((item) => (
        <div
          key={item.name}
          className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow-sm hover:shadow-md transition-shadow duration-200 sm:px-6 sm:pt-6"
        >
          <dt>
            <div className={clsx('absolute rounded-md p-3', item.color)}>
              <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
          </dt>
          <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            <p
              className={clsx(
                'ml-2 flex items-baseline text-sm font-semibold',
                item.changeType === 'increase' ? 'text-green-600' : 
                item.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
              )}
            >
              {item.change}
            </p>
            <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  View all
                </a>
              </div>
            </div>
          </dd>
        </div>
      ))}
    </div>
  );
}