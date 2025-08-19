'use client';

import { 
  TruckIcon, 
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface StatData {
  value: number | string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
}

interface BusinessStatsProps {
  stats?: {
    activeDeliveries: StatData;
    totalRequests: StatData;
  };
  loading?: boolean;
}

interface StatCard {
  name: string;
  key: 'activeDeliveries' | 'totalRequests';
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & { title?: string | undefined; titleId?: string | undefined; } & React.RefAttributes<SVGSVGElement>>;
  color: string;
  description: string;
  formatter?: (value: any) => string;
}

const statCards: StatCard[] = [
  {
    name: 'Active Deliveries',
    key: 'activeDeliveries',
    icon: TruckIcon,
    color: 'bg-blue-500',
    description: 'Currently in transit',
  },
  {
    name: 'Total Requests',
    key: 'totalRequests',
    icon: DocumentTextIcon,
    color: 'bg-primary',
    description: 'This month',
  },
];

export function BusinessStats({ stats, loading = false }: BusinessStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-lg bg-white px-4 pb-6 pt-5 shadow-sm animate-pulse"
          >
            <div className="absolute rounded-md p-3 bg-gray-200 w-12 h-12" />
            <div className="ml-16 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {statCards.map((card) => {
        const statData = stats?.[card.key];
        if (!statData) return null;
        
        const displayValue = card.formatter 
          ? card.formatter(statData.value)
          : statData.value.toString();

        return (
          <div
            key={card.name}
            className="relative overflow-hidden rounded-lg bg-white px-3 pb-5 pt-4 shadow-sm hover:shadow-md transition-shadow duration-200 sm:px-4 sm:pt-5"
          >
            <dt>
              <div className={clsx('absolute rounded-md p-2 sm:p-3', card.color)}>
                <card.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-12 sm:ml-16 truncate text-xs sm:text-sm font-medium text-gray-500">
                {card.name}
              </p>
            </dt>
            <dd className="ml-12 sm:ml-16 flex items-baseline">
              <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                {displayValue}
              </p>
              <p
                className={clsx(
                  'ml-2 flex items-baseline text-xs sm:text-sm font-semibold',
                  statData.changeType === 'increase' ? 'text-green-600' : 
                  statData.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
                )}
              >
                {statData.changeType === 'increase' ? (
                  <ArrowTrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                ) : statData.changeType === 'decrease' ? (
                  <ArrowTrendingDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                ) : null}
                {statData.change}
              </p>
            </dd>
            <p className="ml-12 sm:ml-16 text-xs text-gray-400 mt-1">
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}