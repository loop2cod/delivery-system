'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/providers/AdminProvider';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, Pencil, Trash2, Shield, Users, Settings, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import StaffModal from '@/components/settings/StaffModal';
import toast from 'react-hot-toast';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
  permissions: {
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
  const [activeTab, setActiveTab] = useState<'staff' | 'permissions'>('staff');
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
    }
  }, [isAuthenticated]);

  const loadStaffMembers = async () => {
    try {
      const response = await fetch('/api/admin/staff', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStaffMembers(data.staff || []);
        
        // Calculate stats
        const total = data.staff?.length || 0;
        const active = data.staff?.filter((s: StaffMember) => s.status === 'ACTIVE').length || 0;
        const admins = data.staff?.filter((s: StaffMember) => s.role === 'ADMIN' || s.role === 'SUPER_ADMIN').length || 0;
        
        setStats({
          totalStaff: total,
          activeStaff: active,
          inactiveStaff: total - active,
          admins: admins
        });
      } else {
        console.error('Failed to load staff members');
        toast.error('Failed to load staff members');
      }
    } catch (error) {
      console.error('Error loading staff members:', error);
      toast.error('Error loading staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setStaffMembers(prev => prev.filter(staff => staff.id !== staffId));
        toast.success('Staff member deleted successfully');
        loadStaffMembers(); // Refresh stats
      } else {
        toast.error('Failed to delete staff member');
      }
    } catch (error) {
      console.error('Error deleting staff member:', error);
      toast.error('Error deleting staff member');
    }
  };

  const handleSaveStaff = async (staffData: any) => {
    try {
      const url = editingStaff 
        ? `/api/admin/staff/${editingStaff.id}`
        : '/api/admin/staff';
      
      const method = editingStaff ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(staffData)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (editingStaff) {
          // Update existing staff member
          setStaffMembers(prev => prev.map(staff => 
            staff.id === editingStaff.id ? result.staff : staff
          ));
        } else {
          // Add new staff member
          setStaffMembers(prev => [...prev, result.staff]);
        }

        setEditingStaff(null);
        setShowAddModal(false);
        toast.success(editingStaff ? 'Staff member updated successfully' : 'Staff member created successfully');
        loadStaffMembers(); // Refresh stats
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save staff member');
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error saving staff member:', error);
      throw error;
    }
  };

  const handleToggleStatus = async (staffId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setStaffMembers(prev => prev.map(staff => 
          staff.id === staffId ? { ...staff, status: newStatus as 'ACTIVE' | 'INACTIVE' } : staff
        ));
        toast.success(`Staff member ${newStatus.toLowerCase()}`);
        loadStaffMembers(); // Refresh stats
      } else {
        toast.error('Failed to update staff status');
      }
    } catch (error) {
      console.error('Error updating staff status:', error);
      toast.error('Error updating staff status');
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
                        {Object.entries(staff.permissions).filter(([_, allowed]) => allowed).length} of {Object.keys(staff.permissions).length} sections
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
                              {staffMembers.filter(staff => staff.permissions[section.key as keyof StaffMember['permissions']]).length}
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
          staff={editingStaff}
          isEdit={!!editingStaff}
        />
      </div>
    </AdminLayout>
  );
}