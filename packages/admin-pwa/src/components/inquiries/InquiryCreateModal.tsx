'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { adminAPI, CreateInquiryData } from '@/lib/api';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface InquiryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInquiryCreated: () => void;
}


const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Food & Beverage',
  'Real Estate',
  'Education',
  'Government',
  'Other'
];

const EXPECTED_VOLUMES = [
  '1-10 packages monthly',
  '11-50 packages monthly',
  '51-100 packages monthly',
  '100+ packages monthly',
  'One-time delivery',
  'Weekly deliveries',
  'Daily deliveries'
];

export function InquiryCreateModal({
  isOpen,
  onClose,
  onInquiryCreated,
}: InquiryCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Omit<CreateInquiryData, 'service_type' | 'assigned_staff_id'>>({
    company_name: '',
    industry: '',
    contact_person: '',
    email: '',
    phone: '',
    expected_volume: '',
    special_requirements: '',
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create inquiry data with default values for removed fields
      const inquiryData: CreateInquiryData = {
        ...formData,
        service_type: 'General Delivery', // Default value
        assigned_staff_id: '', // Auto-assign
      };
      
      await adminAPI.createInquiry(inquiryData);
      toast.success('Inquiry created successfully');
      onInquiryCreated();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to create inquiry:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      industry: '',
      contact_person: '',
      email: '',
      phone: '',
      expected_volume: '',
      special_requirements: '',
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Inquiry</DialogTitle>
        </DialogHeader>

        <Card className='border-none shadow-none'>
          <CardContent className="pt-6  p-0">

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Company Name */}
                <div className="sm:col-span-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    type="text"
                    name="company_name"
                    id="company_name"
                    required
                    value={formData.company_name}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                    className="mt-1"
                  />
                </div>

                {/* Industry */}
                <div>
                  <Label htmlFor="industry">Industry *</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => handleSelectChange('industry', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {INDUSTRIES.map(industry => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Person */}
                <div>
                  <Label htmlFor="contact_person">Contact Person *</Label>
                  <Input
                    type="text"
                    name="contact_person"
                    id="contact_person"
                    required
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    placeholder="Enter contact person name"
                    className="mt-1"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    type="email"
                    name="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    className="mt-1"
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    type="tel"
                    name="phone"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+971-XX-XXX-XXXX"
                    pattern="^(\+971|971|0)?[0-9]{8,9}$"
                    className="mt-1"
                  />
                </div>


                {/* Expected Volume */}
                <div>
                  <Label htmlFor="expected_volume">Expected Volume *</Label>
                  <Select
                    value={formData.expected_volume}
                    onValueChange={(value) => handleSelectChange('expected_volume', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select expected volume" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {EXPECTED_VOLUMES.map(volume => (
                        <SelectItem key={volume} value={volume}>
                          {volume}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


                {/* Special Requirements */}
                <div className="sm:col-span-2">
                  <Label htmlFor="special_requirements">Special Requirements</Label>
                  <textarea
                    name="special_requirements"
                    id="special_requirements"
                    rows={3}
                    value={formData.special_requirements}
                    onChange={handleInputChange}
                    className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter any special handling requirements..."
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Inquiry'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}