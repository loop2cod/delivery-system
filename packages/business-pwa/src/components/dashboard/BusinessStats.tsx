'use client';

import { 
  TruckIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface StatCard {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & { title?: string | undefined; titleId?: string | undefined; } & React.RefAttributes<SVGSVGElement>>;
  color: string;
  description: string;
}

const stats: StatCard[] = [
  {
    name: 'Active Deliveries',
    value: '23',
    change: '+12%',
    changeType: 'increase',
    icon: TruckIcon,
    color: 'bg-blue-500',
    description: 'Currently in transit',
  },
  {
    name: 'Total Requests',
    value: '156',
    change: '+18%',
    changeType: 'increase',
    icon: DocumentTextIcon,
    color: 'bg-primary',
    description: 'This month',
  },
  {
    name: 'Monthly Spend',
    value: 'AED 12,450',
    change: '-5%',
    changeType: 'decrease',
    icon: CurrencyDollarIcon,
    color: 'bg-green-500',
    description: 'Total delivery costs',
  },
  {
    name: 'Avg Delivery Time',
    value: '4.2 hrs',
    change: '-8%',
    changeType: 'decrease',
    icon: ClockIcon,
    color: 'bg-yellow-500',
    description: 'Pickup to delivery',
  },
  {
    name: 'Success Rate',
    value: '98.5%',
    change: '+2%',
    changeType: 'increase',
    icon: CheckCircleIcon,
    color: 'bg-emerald-500',
    description: 'Successful deliveries',
  },
  {
    name: 'Urgent Deliveries',
    value: '7',
    change: '+3',
    changeType: 'increase',
    icon: ExclamationTriangleIcon,
    color: 'bg-accent',
    description: 'Requires attention',
  },
];

export function BusinessStats() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((item) => (
        <div
          key={item.name}
          className="relative overflow-hidden rounded-lg bg-white px-4 pb-6 pt-5 shadow-sm hover:shadow-md transition-shadow duration-200 sm:px-6 sm:pt-6"
        >
          <dt>
            <div className={clsx('absolute rounded-md p-3', item.color)}>
              <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
          </dt>
          <dd className="ml-16 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            <p
              className={clsx(
                'ml-2 flex items-baseline text-sm font-semibold',
                item.changeType === 'increase' ? 'text-green-600' : 
                item.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
              )}
            >
              {item.changeType === 'increase' ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              ) : item.changeType === 'decrease' ? (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              ) : null}
              {item.change}
            </p>
          </dd>
          <p className="ml-16 text-xs text-gray-400 mt-1">{item.description}</p>
        </div>
      ))}
    </div>
  );
}