'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/providers/BusinessProvider';
import { BusinessLayout } from '@/components/layout/BusinessLayout';
import { BusinessStats } from '@/components/dashboard/BusinessStats';
import { RecentDeliveries } from '@/components/dashboard/RecentDeliveries';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { businessAPI } from '@/lib/api';
import { toast } from '@/lib/toast';
import { DeliveryChart } from '@/components/dashboard/DeliveryChart';

interface DashboardData {
  stats: {
    activeDeliveries: { value: number; change: string; changeType: 'increase' | 'decrease' | 'neutral' };
    totalRequests: { value: number; change: string; changeType: 'increase' | 'decrease' | 'neutral' };
  };
  recentRequests: any[];
  summary: {
    totalRequests: number;
    activeDeliveries: number;
    urgentDeliveries: number;
    monthlySpend: number;
    successRate: number;
  };
  chartData?: {
    monthlyComparison: Array<{
      month: string;
      requests: number;
      costs: number;
      avgCost: number;
    }>;
    currentMonthStats: {
      avgCost: number;
      successRate: number;
      avgDeliveryTime: string;
      totalRequests: number;
    };
  };
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useBusiness();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data from backend
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await businessAPI.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleActionClick = (action: string) => {
    if (action.startsWith('/')) {
      router.push(action);
    } else if (action.startsWith('urgent-')) {
      toast.success('Urgent action handled');
    } else {
      toast.success('Action executed');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <BusinessLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="company-header rounded-lg px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {getGreeting()}, {user?.firstName}!
              </h1>
              <p className="mt-2 text-white/90 text-sm sm:text-base">
                Welcome to {user?.company?.name} delivery dashboard
              </p>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-white/80">
                <span>Industry: {user?.company?.industry}</span>
                <span className="hidden sm:inline">•</span>
                <span>Role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}</span>
              </div>
            </div>
            <div className="sm:block">
              <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                <div className="text-center sm:text-right">
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {dashboardData?.summary?.activeDeliveries || 0}
                  </p>
                  <p className="text-white/80 text-xs sm:text-sm">Active Deliveries</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <BusinessStats stats={dashboardData?.stats} loading={loading} />

        {/* Charts */}
        <DeliveryChart data={dashboardData?.chartData} loading={loading} />

        {/* Quick Actions */}
        <QuickActions 
          onActionClick={handleActionClick} 
          summary={dashboardData?.summary}
        />

        {/* Recent Deliveries */}
        <RecentDeliveries requests={dashboardData?.recentRequests} loading={loading} />
      </div>
    </BusinessLayout>
  );
}