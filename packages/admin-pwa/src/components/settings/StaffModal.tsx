'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Save, Loader2 } from 'lucide-react';

interface StaffMember {
  id?: string;
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
  status?: 'ACTIVE' | 'INACTIVE';
}

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: StaffMember) => Promise<void>;
  staff?: StaffMember | null;
  isEdit?: boolean;
}

const ADMIN_SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', description: 'View system overview and analytics' },
  { key: 'companies', label: 'Companies', description: 'Manage business companies and accounts' },
  { key: 'drivers', label: 'Drivers', description: 'Manage delivery drivers and assignments' },
  { key: 'inquiries', label: 'Inquiries', description: 'Handle business inquiries and approvals' },
  { key: 'qr_management', label: 'QR Management', description: 'Generate and manage QR codes' },
  { key: 'settings', label: 'Settings', description: 'Manage system settings and staff access' }
];

export default function StaffModal({ isOpen, onClose, onSave, staff, isEdit = false }: StaffModalProps) {
  const [formData, setFormData] = useState<StaffMember>({
    name: '',
    email: '',
    role: 'STAFF',
    permissions: {
      dashboard: true,
      companies: false,
      drivers: false,
      inquiries: false,
      qr_management: true,
      settings: false
    }
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (staff) {
      setFormData(staff);
    } else {
      // Reset form for new staff
      setFormData({
        name: '',
        email: '',
        role: 'STAFF',
        permissions: {
          dashboard: true,
          companies: false,
          drivers: false,
          inquiries: false,
          qr_management: true,
          settings: false
        }
      });
      setPassword('');
    }
    setErrors({});
  }, [staff, isOpen]);

  // Update permissions based on role
  useEffect(() => {
    if (formData.role === 'ADMIN') {
      setFormData(prev => ({
        ...prev,
        permissions: {
          dashboard: true,
          companies: true,
          drivers: true,
          inquiries: true,
          qr_management: true,
          settings: true
        }
      }));
    } else if (formData.role === 'STAFF') {
      setFormData(prev => ({
        ...prev,
        permissions: {
          dashboard: true,
          companies: false,
          drivers: false,
          inquiries: false,
          qr_management: true,
          settings: false
        }
      }));
    }
  }, [formData.role]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!isEdit && !password.trim()) {
      newErrors.password = 'Password is required';
    } else if (!isEdit && password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    try {
      const staffData = { ...formData };
      if (!isEdit) {
        (staffData as any).password = password;
      }

      await onSave(staffData);
      onClose();
    } catch (error) {
      console.error('Error saving staff:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = (section: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]: checked
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>

            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'STAFF' | 'ADMIN' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={staff?.role === 'SUPER_ADMIN'}
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {formData.role === 'ADMIN' 
                  ? 'Full access to all admin panel sections'
                  : 'Limited access based on permissions below'
                }
              </p>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Section Permissions</h3>
            <p className="text-sm text-gray-600">
              Select which admin panel sections this staff member can access.
            </p>

            <div className="space-y-3">
              {ADMIN_SECTIONS.map((section) => (
                <div key={section.key} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    id={section.key}
                    checked={formData.permissions[section.key as keyof typeof formData.permissions]}
                    onChange={(e) => handlePermissionChange(section.key, e.target.checked)}
                    disabled={formData.role === 'ADMIN'}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor={section.key} className="text-sm font-medium text-gray-900 cursor-pointer">
                      {section.label}
                    </label>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {formData.role === 'ADMIN' && (
              <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                Admin role automatically has access to all sections.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md flex items-center disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? 'Update Staff Member' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}