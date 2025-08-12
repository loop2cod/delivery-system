'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAdmin } from '@/providers/AdminProvider';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { adminAPI, Company, formatDate } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  User,
  FileText,
  Globe,
  CreditCard,
  Edit,
  MoreVertical,
  Key,
  Shield,
  Copy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',  
  SUSPENDED: 'bg-red-100 text-red-800',
};

const ACCOUNT_TYPE_COLORS = {
  BASIC: 'bg-blue-100 text-blue-800',
  PREMIUM: 'bg-purple-100 text-purple-800',
  ENTERPRISE: 'bg-yellow-100 text-yellow-800',
};

export default function CompanyDetailPage() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && companyId) {
      loadCompany();
    }
  }, [isAuthenticated, companyId]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getCompany(companyId);
      setCompany(response);
    } catch (error) {
      console.error('Failed to load company:', error);
      toast.error('Failed to load company details');
      router.push('/companies');
    } finally {
      setLoading(false);
    }
  };

  const handleContactCompany = () => {
    if (company) {
      toast.success(`Initiating call to ${company.contact_person}`);
      console.log('Contacting company:', company);
    }
  };

  const handleEditCompany = () => {
    toast('Edit functionality will be implemented soon');
  };

  const handleResetPassword = async () => {
    if (!company) return;
    
    try {
      setResetLoading(true);
      const response = await adminAPI.resetCompanyPassword(company.id);
      setNewPassword(response.newPassword);
      setShowPasswordResetModal(true);
      toast.success('Password reset successfully');
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast.error('Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    toast.success('Password copied to clipboard');
  };

  const handleClosePasswordModal = () => {
    setShowPasswordResetModal(false);
    setNewPassword('');
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!company) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Company not found</h2>
          <p className="text-gray-500 mb-4">The company you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/companies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const joinedDate = formatDate(company.created_at);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/companies')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Companies
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {company.name}
              </h1>
              <p className="text-sm text-gray-500">
                Company Details • Joined {joinedDate.date}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleContactCompany}
            >
              <Phone className="h-4 w-4 mr-2" />
              Contact
            </Button>
            <Button
              variant="outline"
              onClick={handleResetPassword}
              disabled={resetLoading}
            >
              <Key className="h-4 w-4 mr-2" />
              {resetLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <Button
              variant="outline"
              onClick={handleEditCompany}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status and Account Type */}
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className={STATUS_COLORS[company.status]}>
            {company.status}
          </Badge>
          <Badge variant="secondary" className={ACCOUNT_TYPE_COLORS[company.account_type]}>
            {company.account_type} Account
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company Name</label>
                    <p className="text-gray-900 font-medium">{company.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Trade License</label>
                    <p className="text-gray-900 font-mono">{company.trade_license}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Industry</label>
                    <p className="text-gray-900">{company.industry}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Monthly Volume Estimate</label>
                    <p className="text-gray-900">
                      {company.monthly_volume_estimate ? `${company.monthly_volume_estimate} deliveries/month` : 'Not specified'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact Person</label>
                    <p className="text-gray-900 font-medium">{company.contact_person}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-gray-900 flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      {company.phone}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Email Address</label>
                    <p className="text-gray-900 flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {company.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Street Address</label>
                    <p className="text-gray-900">{company.street_address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Area</label>
                    <p className="text-gray-900">{company.area}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">City</label>
                    <p className="text-gray-900">{company.city}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Emirate</label>
                    <p className="text-gray-900">{company.emirate}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Country</label>
                    <p className="text-gray-900">{company.country || 'UAE'}</p>
                  </div>
                  {company.postal_code && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Postal Code</label>
                      <p className="text-gray-900">{company.postal_code}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{company.total_requests}</div>
                  <div className="text-sm text-blue-600">Total Requests</div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <Badge variant="secondary" className={STATUS_COLORS[company.status]}>
                      {company.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Account Type</span>
                    <Badge variant="secondary" className={ACCOUNT_TYPE_COLORS[company.account_type]}>
                      {company.account_type}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Credit Terms</label>
                  <p className="text-gray-900">
                    {company.credit_terms ? `${company.credit_terms} days` : 'Cash on delivery'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Created</label>
                  <p className="text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {joinedDate.date}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-gray-900">
                    {formatDate(company.updated_at).date}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Business User Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Business Portal Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Business User</label>
                  <p className="text-gray-900">{company.contact_person}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Login Email</label>
                  <p className="text-gray-900">{company.email}</p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className="w-full"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-700">
                    The business user can log in to the business portal using their email address.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            {company.latitude && company.longitude && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Coordinates</div>
                    <div className="text-sm font-mono text-gray-900">
                      {company.latitude}, {company.longitude}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Password Reset Modal */}
        {showPasswordResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Password Reset Successful</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePasswordModal}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  A new temporary password has been generated for <strong>{company?.contact_person}</strong>. 
                  Please share this securely with the business user.
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newPassword}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPassword}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Security Note:</strong> This password is temporary. 
                    Advise the user to change it after their first login.
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleClosePasswordModal}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleCopyPassword}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Password
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}