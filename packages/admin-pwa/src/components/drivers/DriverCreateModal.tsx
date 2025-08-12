'use client';

import { useState } from 'react';
import {
  UserIcon,
  TruckIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { CreateDriverData, adminAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import toast from 'react-hot-toast';

interface DriverCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriverCreated: () => void;
}

interface DriverFormData extends CreateDriverData {
  confirmEmail: string;
}

const VEHICLE_TYPES = [
  'MOTORCYCLE',
  'SEDAN', 
  'VAN',
  'TRUCK',
];

const EMIRATES = [
  'Abu Dhabi',
  'Dubai',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
];

export function DriverCreateModal({
  isOpen,
  onClose,
  onDriverCreated,
}: DriverCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<DriverFormData>({
    name: '',
    email: '',
    confirmEmail: '',
    phone: '',
    license_number: '',
    license_expiry: '',
    vehicle_type: 'SEDAN' as const,
    vehicle_plate: '',
    emergency_contact: {
      name: '',
      phone: '',
      relationship: '',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergency_contact: {
        ...prev.emergency_contact!,
        [field]: value,
      },
    }));
    
    // Clear error when user starts typing
    const errorKey = `emergency_contact.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.license_number.trim()) newErrors.license_number = 'License number is required';
    if (!formData.license_expiry) newErrors.license_expiry = 'License expiry is required';
    if (!formData.vehicle_type) newErrors.vehicle_type = 'Vehicle type is required';
    if (!formData.vehicle_plate.trim()) newErrors.vehicle_plate = 'Vehicle plate is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Email confirmation
    if (formData.email !== formData.confirmEmail) {
      newErrors.confirmEmail = 'Email addresses do not match';
    }

    // Phone validation (UAE format)
    const phoneRegex = /^(\+971|971|0)?[0-9]{8,9}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Please enter a valid UAE phone number';
    }

    // License expiry validation (must be future date)
    if (formData.license_expiry) {
      const expiryDate = new Date(formData.license_expiry);
      const today = new Date();
      if (expiryDate <= today) {
        newErrors.license_expiry = 'License expiry must be a future date';
      }
    }

    // Emergency contact validation (if any field is filled, all should be filled)
    const emergencyContact = formData.emergency_contact;
    if (emergencyContact && (emergencyContact.name || emergencyContact.phone || emergencyContact.relationship)) {
      if (!emergencyContact.name.trim()) newErrors['emergency_contact.name'] = 'Emergency contact name is required';
      if (!emergencyContact.phone.trim()) newErrors['emergency_contact.phone'] = 'Emergency contact phone is required';
      if (!emergencyContact.relationship.trim()) newErrors['emergency_contact.relationship'] = 'Relationship is required';
      
      // Validate emergency contact phone
      if (emergencyContact.phone && !phoneRegex.test(emergencyContact.phone.replace(/\s+/g, ''))) {
        newErrors['emergency_contact.phone'] = 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      // Remove confirmEmail and empty emergency contact before sending
      const submitData: CreateDriverData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        license_number: formData.license_number.trim(),
        license_expiry: formData.license_expiry,
        vehicle_type: formData.vehicle_type,
        vehicle_plate: formData.vehicle_plate.trim(),
      };

      // Only include emergency contact if all fields are filled
      const emergencyContact = formData.emergency_contact;
      if (emergencyContact && emergencyContact.name && emergencyContact.phone && emergencyContact.relationship) {
        submitData.emergency_contact = {
          name: emergencyContact.name.trim(),
          phone: emergencyContact.phone.trim(),
          relationship: emergencyContact.relationship.trim(),
        };
      }

      await adminAPI.createDriver(submitData);
      toast.success('Driver created successfully!');
      onDriverCreated();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create driver:', error);
      toast.error(error.message || 'Failed to create driver');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        email: '',
        confirmEmail: '',
        phone: '',
        license_number: '',
        license_expiry: '',
        vehicle_type: 'SEDAN' as const,
        vehicle_plate: '',
        emergency_contact: {
          name: '',
          phone: '',
          relationship: '',
        },
      });
      setErrors({});
      onClose();
    }
  };

  // Generate minimum date for license expiry (today + 1 day)
  const minExpiryDate = new Date();
  minExpiryDate.setDate(minExpiryDate.getDate() + 1);
  const minExpiryDateString = minExpiryDate.toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className='pb-3'>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold leading-6 text-gray-900">
                  Add New Driver
                </DialogTitle>
                <p className="text-sm text-gray-500">
                  Create a new driver profile for the delivery system
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Personal Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <UserIcon className="h-5 w-5 mr-2" />
                            Personal Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              placeholder="Enter driver's full name"
                              className={errors.name ? 'border-red-500' : ''}
                              disabled={loading}
                            />
                            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                          </div>

                          <div>
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              placeholder="driver@example.com"
                              className={errors.email ? 'border-red-500' : ''}
                              disabled={loading}
                            />
                            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                          </div>

                          <div>
                            <Label htmlFor="confirmEmail">Confirm Email Address *</Label>
                            <Input
                              id="confirmEmail"
                              type="email"
                              value={formData.confirmEmail}
                              onChange={(e) => handleInputChange('confirmEmail', e.target.value)}
                              placeholder="Confirm email address"
                              className={errors.confirmEmail ? 'border-red-500' : ''}
                              disabled={loading}
                            />
                            {errors.confirmEmail && <p className="text-sm text-red-500 mt-1">{errors.confirmEmail}</p>}
                          </div>

                          <div>
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              placeholder="+971 50 123 4567"
                              className={errors.phone ? 'border-red-500' : ''}
                              disabled={loading}
                            />
                            {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
                          </div>
                        </CardContent>
                      </Card>

                      {/* License & Vehicle Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <TruckIcon className="h-5 w-5 mr-2" />
                            License & Vehicle Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="license_number">License Number *</Label>
                            <Input
                              id="license_number"
                              value={formData.license_number}
                              onChange={(e) => handleInputChange('license_number', e.target.value)}
                              placeholder="UAE License Number"
                              className={errors.license_number ? 'border-red-500' : ''}
                              disabled={loading}
                            />
                            {errors.license_number && <p className="text-sm text-red-500 mt-1">{errors.license_number}</p>}
                          </div>

                          <div>
                            <Label htmlFor="license_expiry">License Expiry Date *</Label>
                            <Input
                              id="license_expiry"
                              type="date"
                              value={formData.license_expiry}
                              onChange={(e) => handleInputChange('license_expiry', e.target.value)}
                              min={minExpiryDateString}
                              className={errors.license_expiry ? 'border-red-500' : ''}
                              disabled={loading}
                            />
                            {errors.license_expiry && <p className="text-sm text-red-500 mt-1">{errors.license_expiry}</p>}
                          </div>

                          <div>
                            <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                            <Select
                              value={formData.vehicle_type}
                              onValueChange={(value) => handleInputChange('vehicle_type', value)}
                              disabled={loading}
                            >
                              <SelectTrigger className={errors.vehicle_type ? 'border-red-500' : 'bg-background'}>
                                <SelectValue placeholder="Select vehicle type" />
                              </SelectTrigger>
                              <SelectContent className="w-full bg-background">
                                {VEHICLE_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors.vehicle_type && <p className="text-sm text-red-500 mt-1">{errors.vehicle_type}</p>}
                          </div>

                          <div>
                            <Label htmlFor="vehicle_plate">Vehicle Plate Number *</Label>
                            <Input
                              id="vehicle_plate"
                              value={formData.vehicle_plate}
                              onChange={(e) => handleInputChange('vehicle_plate', e.target.value)}
                              placeholder="A 12345"
                              className={errors.vehicle_plate ? 'border-red-500' : ''}
                              disabled={loading}
                            />
                            {errors.vehicle_plate && <p className="text-sm text-red-500 mt-1">{errors.vehicle_plate}</p>}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Emergency Contact (Optional) */}
                      <Card className="lg:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <PhoneIcon className="h-5 w-5 mr-2" />
                            Emergency Contact (Optional)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="emergency_name">Contact Name</Label>
                              <Input
                                id="emergency_name"
                                value={formData.emergency_contact?.name || ''}
                                onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                                placeholder="Emergency contact name"
                                className={errors['emergency_contact.name'] ? 'border-red-500' : ''}
                                disabled={loading}
                              />
                              {errors['emergency_contact.name'] && (
                                <p className="text-sm text-red-500 mt-1">{errors['emergency_contact.name']}</p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="emergency_phone">Contact Phone</Label>
                              <Input
                                id="emergency_phone"
                                value={formData.emergency_contact?.phone || ''}
                                onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                                placeholder="+971 50 123 4567"
                                className={errors['emergency_contact.phone'] ? 'border-red-500' : ''}
                                disabled={loading}
                              />
                              {errors['emergency_contact.phone'] && (
                                <p className="text-sm text-red-500 mt-1">{errors['emergency_contact.phone']}</p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="emergency_relationship">Relationship</Label>
                              <Select
                                value={formData.emergency_contact?.relationship || ''}
                                onValueChange={(value) => handleEmergencyContactChange('relationship', value)}
                                disabled={loading}
                              >
                                <SelectTrigger className={errors['emergency_contact.relationship'] ? 'border-red-500' : ''}>
                                  <SelectValue placeholder="Select relationship" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Spouse">Spouse</SelectItem>
                                  <SelectItem value="Parent">Parent</SelectItem>
                                  <SelectItem value="Sibling">Sibling</SelectItem>
                                  <SelectItem value="Child">Child</SelectItem>
                                  <SelectItem value="Friend">Friend</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              {errors['emergency_contact.relationship'] && (
                                <p className="text-sm text-red-500 mt-1">{errors['emergency_contact.relationship']}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between mt-6 -mx-6 -mb-6 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Driver'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}