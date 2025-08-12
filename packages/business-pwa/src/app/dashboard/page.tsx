'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/providers/BusinessProvider';
import { BusinessLayout } from '@/components/layout/BusinessLayout';
import { BusinessStats } from '@/components/dashboard/BusinessStats';
import { RecentDeliveries } from '@/components/dashboard/RecentDeliveries';
import { DeliveryChart } from '@/components/dashboard/DeliveryChart';
import { QuickActions } from '@/components/dashboard/QuickActions';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
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
      <div className="space-y-8">
        {/* Header */}
        <div className="company-header rounded-lg px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {getGreeting()}, {user?.firstName}!
              </h1>
              <p className="mt-2 text-white/90">
                Welcome to {user?.company?.name} delivery dashboard
              </p>
              <div className="mt-4 flex items-center space-x-4 text-sm text-white/80">
                <span>Industry: {user?.company?.industry}</span>
                <span>•</span>
                <span>Role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">23</p>
                  <p className="text-white/80 text-sm">Active Deliveries</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <BusinessStats />

        {/* Charts */}
        <DeliveryChart />

        {/* Quick Actions */}
        <QuickActions onActionClick={handleActionClick} />

        {/* Recent Deliveries */}
        <RecentDeliveries />

        {/* Company Overview */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Company Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Monthly Budget</h4>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">AED 15,000</span>
                <span className="text-sm text-green-600">83% used</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '83%' }}></div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Team Members</h4>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">12</span>
                <span className="text-sm text-blue-600">8 active</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Manager, employees, and admins
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Service Level</h4>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">Pro</span>
                <span className="text-sm text-purple-600">Premium</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Unlimited deliveries, priority support
              </p>
            </div>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}