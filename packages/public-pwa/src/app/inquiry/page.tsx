/**
 * Business Inquiry Page
 * Form for businesses to submit delivery service inquiries that go to admin system
 */

'use client';

import React, { useState } from 'react';
import { ArrowRight, Building, Users, Package, Phone, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { submitInquiry, CreateInquiryData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useToast } from '@/components/ui/use-toast';

interface InquiryForm {
  company_name: string;
  industry: string;
  contact_person: string;
  email: string;
  phone: string;
  expected_volume: string;
  special_requirements: string;
  service_type: string;
}

const industries = [
  'E-commerce & Retail',
  'Food & Beverage',
  'Healthcare & Pharmaceuticals',
  'Logistics & Transportation',
  'Manufacturing',
  'Technology',
  'Real Estate',
  'Education',
  'Government',
  'Other'
];

const expectedVolumes = [
  'Less than 50 deliveries/month',
  '50-200 deliveries/month',
  '200-500 deliveries/month',
  '500-1000 deliveries/month',
  '1000-2000 deliveries/month',
  '2000+ deliveries/month',
  'Project-based deliveries'
];

const serviceTypes = [
  'Same-day delivery',
  'Next-day delivery',
  'Express delivery (2-4 hours)',
  'Scheduled delivery',
  'Bulk delivery services',
  'Temperature-controlled delivery',
  'Fragile items delivery',
  'Document delivery',
  'Mixed services'
];

export default function InquiryPage() {
  const [form, setForm] = useState<InquiryForm>({
    company_name: '',
    industry: '',
    contact_person: '',
    email: '',
    phone: '',
    expected_volume: '',
    special_requirements: '',
    service_type: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<InquiryForm>>({});
  const { toast } = useToast();

  const handleInputChange = (field: keyof InquiryForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Check if it matches UAE phone number patterns
    // Pattern: ^(\+971|971|0)?[0-9]{8,9}$
    // This means: optional +971, 971, or 0 prefix, followed by 8-9 digits

    if (cleaned.length === 8 || cleaned.length === 9) {
      // 8-9 digits without prefix (e.g., 50123456, 501234567)
      return true;
    }
    if (cleaned.length === 11 && cleaned.startsWith('971')) {
      // 971 prefix + 8 digits (e.g., 97150123456)
      return true;
    }
    if (cleaned.length === 12 && cleaned.startsWith('971')) {
      // 971 prefix + 9 digits (e.g., 971501234567)
      return true;
    }
    if (cleaned.length === 9 && cleaned.startsWith('0')) {
      // 0 prefix + 8 digits (e.g., 050123456)
      return true;
    }
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      // 0 prefix + 9 digits (e.g., 0501234567)
      return true;
    }

    return false;
  };

  const formatPhoneForAPI = (phone: string): string => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Format according to API requirements: ^(\+971|971|0)?[0-9]{8,9}$
    if (cleaned.length === 8 || cleaned.length === 9) {
      // Just the number without prefix
      return cleaned;
    }
    if (cleaned.length === 11 && cleaned.startsWith('971')) {
      // Remove 971 prefix and return just the number
      return cleaned.slice(3);
    }
    if (cleaned.length === 12 && cleaned.startsWith('971')) {
      // Remove 971 prefix and return just the number
      return cleaned.slice(3);
    }
    if (cleaned.length === 9 && cleaned.startsWith('0')) {
      // Keep 0 prefix
      return cleaned;
    }
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      // Keep 0 prefix
      return cleaned;
    }

    // If no pattern matches, return as is
    return cleaned;
  };

  const validateForm = (): boolean => {
    const errors: Partial<InquiryForm> = {};

    if (!form.company_name.trim()) {
      errors.company_name = 'Company name is required';
    }
    if (!form.contact_person.trim()) {
      errors.contact_person = 'Contact person name is required';
    }
    if (!form.email.trim()) {
      errors.email = 'Email address is required';
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!validatePhoneNumber(form.phone)) {
      errors.phone = 'Please enter a valid UAE phone number (e.g., 050 123 4567, +971 50 123 4567)';
    }
    if (!form.industry) {
      errors.industry = 'Please select your industry';
    }
    if (!form.expected_volume) {
      errors.expected_volume = 'Please select your expected delivery volume';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const inquiryData: CreateInquiryData = {
        company_name: form.company_name.trim(),
        industry: form.industry,
        contact_person: form.contact_person.trim(),
        email: form.email.trim().toLowerCase(),
        phone: formatPhoneForAPI(form.phone.trim()),
        expected_volume: form.expected_volume,
        special_requirements: form.special_requirements.trim() || undefined,
        service_type: form.service_type || undefined
      };

      const result = await submitInquiry(inquiryData);

      if (result.success) {
        const referenceNumber = result.inquiry?.reference_number;
        toast({
          title: "Success!",
          description: `Your inquiry has been submitted successfully${referenceNumber ? ` (Reference: ${referenceNumber})` : ''}. We'll contact you within 24 hours.`,
          duration: 8000,
        });
        setSubmittedInquiry(result.inquiry);
        setIsSuccess(true);
      } else {
        toast({
          title: "Submission Failed",
          description: result.message || 'Failed to submit inquiry. Please try again.',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Inquiry submission error:', error);
      toast({
        title: "Error",
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success page
  if (isSuccess) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 sm:py-8 mt-10 md:mt-16">
          <div className="max-w-2xl mx-auto px-3 sm:px-4">
            <Card className="shadow-lg border-0">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
                  Inquiry Submitted!
                </CardTitle>
                {submittedInquiry?.reference_number && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700 font-medium">Reference Number</p>
                    <p className="text-lg font-mono font-bold text-blue-900">{submittedInquiry.reference_number}</p>
                  </div>
                )}
                <CardDescription className="text-base text-slate-600">
                  Thank you for your interest. We'll contact you within 24 hours to discuss your delivery needs.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-xl text-slate-800 text-center">What happens next?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">1</div>
                        <h4 className="font-semibold text-slate-800 mb-2">Review</h4>
                        <p className="text-sm text-slate-600">We review your requirements and prepare a customized solution</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">2</div>
                        <h4 className="font-semibold text-slate-800 mb-2">Contact</h4>
                        <p className="text-sm text-slate-600">Our team calls you within 24 hours to discuss details</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">3</div>
                        <h4 className="font-semibold text-slate-800 mb-2">Setup</h4>
                        <p className="text-sm text-slate-600">We prepare and activate your delivery service plan</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Phone className="w-5 h-5" />
                        Need immediate assistance?
                      </h4>
                      <p className="text-sm text-blue-700 mb-3">Call our business hotline for urgent inquiries</p>
                      <p className="font-bold text-blue-900 text-lg">+971 4 123 4567</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Track existing deliveries?
                      </h4>
                      <p className="text-sm text-green-700 mb-3">Already have a delivery in progress?</p>
                      <Button variant="link" className="p-0 h-auto font-semibold text-green-900" asChild>
                        <a href="/track">Track Your Package →</a>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    onClick={() => window.location.href = '/'}
                    size="lg"
                  >
                    Return to Homepage
                  </Button>
                  <Button
                    onClick={() => setIsSuccess(false)}
                    variant="outline"
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    size="lg"
                  >
                    Submit Another Inquiry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 sm:py-8 mt-10 md:mt-16">
        <div className="max-w-2xl mx-auto px-3 sm:px-4">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">
              Business Inquiry
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Get a customized delivery solution for your business. We'll contact you within 24 hours.
            </p>
          </div>

          {/* Form */}
          <Card className="shadow-lg border-0">
            <form onSubmit={handleSubmit}>

              <CardContent className="p-4 sm:p-6 space-y-6">

                {/* Company Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Company Details</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company_name" className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Company Name *
                      </Label>
                      <Input
                        id="company_name"
                        type="text"
                        required
                        value={form.company_name}
                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                        placeholder="Your company name"
                        disabled={isSubmitting}
                        className={`h-11 ${fieldErrors.company_name ? "border-red-500" : ""}`}
                      />
                      {fieldErrors.company_name && (
                        <p className="text-sm text-red-600 mt-1">{fieldErrors.company_name}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Industry *
                      </Label>
                      <Select
                        value={form.industry}
                        onValueChange={(value) => handleInputChange('industry', value)}
                        disabled={isSubmitting}
                        required
                      >
                        <SelectTrigger className={`h-11 ${fieldErrors.industry ? "border-red-500" : ""}`}>
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent className='bg-white'>
                          {industries.map(industry => (
                            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.industry && (
                        <p className="text-sm text-red-600 mt-1">{fieldErrors.industry}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Contact Details</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="contact_person" className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Contact Person *
                      </Label>
                      <Input
                        id="contact_person"
                        type="text"
                        required
                        value={form.contact_person}
                        onChange={(e) => handleInputChange('contact_person', e.target.value)}
                        placeholder="Full name"
                        disabled={isSubmitting}
                        className={`h-11 ${fieldErrors.contact_person ? "border-red-500" : ""}`}
                      />
                      {fieldErrors.contact_person && (
                        <p className="text-sm text-red-600 mt-1">{fieldErrors.contact_person}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="business@company.com"
                        disabled={isSubmitting}
                        className={`h-11 ${fieldErrors.email ? "border-red-500" : ""}`}
                      />
                      {fieldErrors.email && (
                        <p className="text-sm text-red-600 mt-1">{fieldErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Phone Number *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="050 123 4567"
                        disabled={isSubmitting}
                        className={`h-11 ${fieldErrors.phone ? "border-red-500" : ""}`}
                      />
                      {fieldErrors.phone ? (
                        <p className="text-sm text-red-600 mt-1">{fieldErrors.phone}</p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-1">UAE phone number format</p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Service Requirements */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Service Requirements</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Expected Monthly Volume *
                      </Label>
                      <Select
                        value={form.expected_volume}
                        onValueChange={(value) => handleInputChange('expected_volume', value)}
                        disabled={isSubmitting}
                        required
                      >
                        <SelectTrigger className={`h-11 ${fieldErrors.expected_volume ? "border-red-500" : ""}`}>
                          <SelectValue placeholder="Select volume" />
                        </SelectTrigger>
                        <SelectContent className='bg-white'>
                          {expectedVolumes.map(volume => (
                            <SelectItem key={volume} value={volume}>{volume}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.expected_volume && (
                        <p className="text-sm text-red-600 mt-1">{fieldErrors.expected_volume}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Preferred Service Type
                      </Label>
                      <Select
                        value={form.service_type}
                        onValueChange={(value) => handleInputChange('service_type', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select service (optional)" />
                        </SelectTrigger>
                        <SelectContent className='bg-white'>
                          {serviceTypes.map(service => (
                            <SelectItem key={service} value={service}>{service}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Additional Requirements
                      </Label>
                      <Textarea
                        value={form.special_requirements}
                        onChange={(e) => handleInputChange('special_requirements', e.target.value)}
                        rows={3}
                        className="resize-none text-sm"
                        placeholder="Any special requirements, delivery windows, or questions..."
                        disabled={isSubmitting}
                        maxLength={500}
                      />
                      <div className="text-right text-xs text-slate-500 mt-1">
                        {form.special_requirements.length}/500
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-slate-200">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Business Inquiry
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500 text-center mt-3">
                    We'll contact you within 24 hours to discuss your delivery needs
                  </p>
                </div>
              </CardContent>
            </form>
          </Card>

          {/* Contact Information */}
          <Card className="mt-6 shadow-lg border-0">
            <CardContent className="p-4 text-center">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Need immediate assistance?</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-slate-600">Call us</p>
                    <p className="font-semibold text-slate-800">+971545821123</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Mail className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-slate-600">Email us</p>
                    <p className="font-semibold text-slate-800">support@grsdeliver.com</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}