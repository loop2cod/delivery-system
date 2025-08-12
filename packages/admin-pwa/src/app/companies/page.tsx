'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/providers/AdminProvider';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { CompaniesTable } from '@/components/companies/CompaniesTable';
import { adminAPI, Company } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Building2,
  Users,
  TrendingUp,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CompaniesPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    inactiveCompanies: 0,
    totalRequests: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCompanies();
    }
  }, [isAuthenticated, pagination.page, pagination.limit, filters]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getCompanies({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status === 'all' ? '' : filters.status || undefined,
        search: filters.search || undefined,
      });
      
      setCompanies(response.companies);
      setPagination(response.pagination);
      
      // Calculate stats from the companies data
      const activeCount = response.companies.filter(c => c.status === 'ACTIVE').length;
      const inactiveCount = response.companies.filter(c => c.status !== 'ACTIVE').length;
      const totalRequests = response.companies.reduce((sum, c) => sum + parseInt(c.total_requests || '0'), 0);
      
      setStats({
        totalCompanies: response.pagination.total,
        activeCompanies: activeCount,
        inactiveCompanies: inactiveCount,
        totalRequests,
      });
    } catch (error) {
      console.error('Failed to load companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

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

  const handleViewCompany = (company: Company) => {
    // Navigate to company detail page
    router.push(`/companies/${company.id}`);
  };

  const handleContactCompany = (company: Company) => {
    toast.success(`Initiating call to ${company.contact_person}`);
    // Implement call functionality
    console.log('Contacting company:', company);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleExportCompanies = () => {
    toast.success('Exporting companies to CSV');
    // TODO: Implement export functionality
  };

  const statsDisplay = [
    { 
      name: 'Total Companies', 
      value: stats.totalCompanies.toString(), 
      icon: Building2,
      change: '+8%', 
      changeType: 'increase' as const
    },
    { 
      name: 'Active Companies', 
      value: stats.activeCompanies.toString(), 
      icon: TrendingUp,
      change: '+12%', 
      changeType: 'increase' as const
    },
    { 
      name: 'Inactive/Suspended', 
      value: stats.inactiveCompanies.toString(), 
      icon: Users,
      change: '-3%', 
      changeType: 'decrease' as const
    },
    { 
      name: 'Total Requests', 
      value: stats.totalRequests.toString(), 
      icon: TrendingUp,
      change: '+25%', 
      changeType: 'increase' as const
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Companies
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage registered companies and their delivery services
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleExportCompanies}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statsDisplay.map((item) => (
            <Card key={item.name}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-muted-foreground truncate">
                        {item.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-foreground">
                          {item.value}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Companies Table */}
        <CompaniesTable
          companies={companies}
          loading={loading}
          pagination={pagination}
          filters={filters}
          onViewCompany={handleViewCompany}
          onContactCompany={handleContactCompany}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
        />
      </div>
    </AdminLayout>
  );
}