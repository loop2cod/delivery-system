'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/providers/AdminProvider';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, Pencil, Trash2, Shield, Users, Settings, UserCheck, UserX, DollarSign, Weight, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import StaffModal from '@/components/settings/StaffModal';
import PricingManager from '@/components/settings/PricingManager';
import toast from 'react-hot-toast';
import { adminAPI, PricingTier, DeliveryPricing } from '@/lib/api';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
  permissions?: {
    dashboard: boolean;
    companies: boolean;
    drivers: boolean;
    inquiries: boolean;
    qr_management: boolean;
    settings: boolean;
  };
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  last_login?: string;
}



const ADMIN_SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', description: 'View system overview and analytics' },
  { key: 'companies', label: 'Companies', description: 'Manage business companies and accounts' },
  { key: 'drivers', label: 'Drivers', description: 'Manage delivery drivers and assignments' },
  { key: 'inquiries', label: 'Inquiries', description: 'Handle business inquiries and approvals' },
  { key: 'qr_management', label: 'QR Management', description: 'Generate and manage QR codes' },
  { key: 'settings', label: 'Settings', description: 'Manage system settings and staff access' }
];

export default function SettingsPage() {
  const { isAuthenticated, isLoading, user } = useAdmin();
  const router = useRouter();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState<'staff' | 'permissions' | 'pricing'>('staff');
  const [defaultPricing, setDefaultPricing] = useState<DeliveryPricing | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    admins: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStaffMembers();
      loadDefaultPricing();
    }
  }, [isAuthenticated]);

  const loadStaffMembers = async () => {
    try {
      const data = await adminAPI.getStaff();
      
      // Ensure all staff members have permissions object
      const staffWithPermissions = (data.staff || []).map((staff: any) => ({
        ...staff,
        permissions: staff.permissions || {
          dashboard: false,
          companies: false,
          drivers: false,
          inquiries: false,
          qr_management: false,
          settings: false
        }
      }));
      
      setStaffMembers(staffWithPermissions);
      
      // Calculate stats
      const total = staffWithPermissions.length;
      const active = staffWithPermissions.filter((s: StaffMember) => s.status === 'ACTIVE').length;
      const admins = staffWithPermissions.filter((s: StaffMember) => s.role === 'ADMIN' || s.role === 'SUPER_ADMIN').length;
      
      setStats({
        totalStaff: total,
        activeStaff: active,
        inactiveStaff: total - active,
        admins: admins
      });
    } catch (error: any) {
      console.error('Error loading staff members:', error);
      const message = error.response?.data?.error || error.message || 'Failed to load staff members';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      await adminAPI.deleteStaff(staffId);
      setStaffMembers(prev => prev.filter(staff => staff.id !== staffId));
      toast.success('Staff member deleted successfully');
      loadStaffMembers(); // Refresh stats
    } catch (error: any) {
      console.error('Error deleting staff member:', error);
      const message = error.response?.data?.error || error.message || 'Failed to delete staff member';
      toast.error(message);
    }
  };

  const handleSaveStaff = async (staffData: any) => {
    try {
      let result: any;
      
      if (editingStaff) {
        // Update existing staff member
        result = await adminAPI.updateStaff(editingStaff.id, staffData);
        setStaffMembers(prev => prev.map(staff => 
          staff.id === editingStaff.id ? result.staff : staff
        ));
        toast.success('Staff member updated successfully');
      } else {
        // Create new staff member
        result = await adminAPI.createStaff(staffData);
        setStaffMembers(prev => [...prev, result.staff]);
        toast.success('Staff member created successfully');
      }

      setEditingStaff(null);
      setShowAddModal(false);
      loadStaffMembers(); // Refresh stats
    } catch (error: any) {
      console.error('Error saving staff member:', error);
      const message = error.response?.data?.error || error.message || 'Failed to save staff member';
      toast.error(message);
      throw error;
    }
  };

  const loadDefaultPricing = async () => {
    setPricingLoading(true);
    try {
      const data = await adminAPI.getDefaultPricing();
      setDefaultPricing(data.pricing);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No default pricing exists yet
        setDefaultPricing(null);
      } else {
        console.error('Error loading default pricing:', error);
        const message = error.response?.data?.error || error.message || 'Failed to load default pricing';
        toast.error(message);
      }
    } finally {
      setPricingLoading(false);
    }
  };

  const handleToggleStatus = async (staffId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      await adminAPI.updateStaff(staffId, { status: newStatus });
      setStaffMembers(prev => prev.map(staff => 
        staff.id === staffId ? { ...staff, status: newStatus as 'ACTIVE' | 'INACTIVE' } : staff
      ));
      toast.success(`Staff member ${newStatus.toLowerCase()}`);
      loadStaffMembers(); // Refresh stats
    } catch (error: any) {
      console.error('Error updating staff status:', error);
      const message = error.response?.data?.error || error.message || 'Failed to update staff status';
      toast.error(message);
    }
  };

  const handleSyncAllCompanies = async () => {
    if (!confirm('This will create pricing records for all companies that don\'t have them yet, based on the current default pricing. Continue?')) {
      return;
    }

    try {
      const result = await adminAPI.syncAllCompaniesWithDefaultPricing();
      const { companiesCreated, companiesSkipped, totalCompanies } = result.syncStats;
      
      if (companiesCreated > 0) {
        toast.success(
          `Successfully synced ${companiesCreated} companies with default pricing. ` +
          `${companiesSkipped} companies already had pricing.`
        );
      } else {
        toast.success('All companies already have pricing configured.');
      }
    } catch (error: any) {
      console.error('Error syncing companies:', error);
      const message = error.response?.data?.error || error.message || 'Failed to sync companies';
      toast.error(message);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statsDisplay = [
    { 
      name: 'Total Staff', 
      value: stats.totalStaff.toString(), 
      icon: Users,
      change: '+2', 
      changeType: 'increase' as const
    },
    { 
      name: 'Active Staff', 
      value: stats.activeStaff.toString(), 
      icon: UserCheck,
      change: `${stats.activeStaff}/${stats.totalStaff}`, 
      changeType: 'neutral' as const
    },
    { 
      name: 'Administrators', 
      value: stats.admins.toString(), 
      icon: Shield,
      change: 'Admin level', 
      changeType: 'neutral' as const
    },
    { 
      name: 'Inactive Staff', 
      value: stats.inactiveStaff.toString(), 
      icon: UserX,
      change: stats.inactiveStaff > 0 ? 'Review needed' : 'All active', 
      changeType: stats.inactiveStaff > 0 ? 'decrease' as const : 'neutral' as const
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage admin panel access and staff permissions
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
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
                          item.changeType === 'increase' ? 'text-green-600' : 
                          item.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
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

        {/* Tabs */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === 'staff'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Staff Management
                </button>
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === 'permissions'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Permission Overview
                </button>
                <button
                  onClick={() => setActiveTab('pricing')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === 'pricing'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Delivery Pricing
                </button>
              </nav>
            </div>

            {activeTab === 'staff' && (
              <div className="p-6">
                {/* Staff Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staffMembers.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                        <div className="text-sm text-gray-500">{staff.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRoleIcon(staff.role)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(staff.role)}`}>
                          {staff.role.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {staff.permissions ? 
                          `${Object.entries(staff.permissions).filter(([_, allowed]) => allowed).length} of ${Object.keys(staff.permissions).length} sections`
                          : 'No permissions set'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(staff.id, staff.status)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          staff.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {staff.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {staff.last_login ? new Date(staff.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingStaff(staff)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {staff.role !== 'SUPER_ADMIN' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStaff(staff.id)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
                  </table>

                  {staffMembers.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No staff members found</p>
                      <Button
                        onClick={() => setShowAddModal(true)}
                        variant="outline"
                      >
                        Add your first staff member
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Panel Sections</h3>
                  <p className="text-sm text-gray-500">Overview of admin panel sections and staff access levels</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {ADMIN_SECTIONS.map((section) => (
                    <div key={section.key} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{section.label}</h4>
                          <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                          <div className="text-sm">
                            <span className="text-gray-500">Staff with access: </span>
                            <span className="font-medium text-primary">
                              {staffMembers.filter(staff => staff.permissions && staff.permissions[section.key as keyof StaffMember['permissions']]).length}
                            </span>
                          </div>
                        </div>
                        <Settings className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">Default Delivery Pricing</h3>
                    <Button
                      variant="outline"
                      onClick={handleSyncAllCompanies}
                      disabled={!defaultPricing}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      Sync All Companies
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    Configure the default pricing structure that will be automatically applied to all companies.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <p className="text-sm text-amber-700">
                      <strong>Important:</strong> When you update default pricing, it will automatically sync to all companies 
                      that haven't been customized. Companies with custom pricing will remain unchanged.
                    </p>
                  </div>
                </div>
                
                {pricingLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <PricingManager
                    pricing={defaultPricing}
                    onUpdate={loadDefaultPricing}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Modal for Add/Edit */}
        <StaffModal
          isOpen={showAddModal || !!editingStaff}
          onClose={() => {
            setShowAddModal(false);
            setEditingStaff(null);
          }}
          onSave={handleSaveStaff}
          staff={editingStaff as any}
          isEdit={!!editingStaff}
        />
      </div>
    </AdminLayout>
  );
}