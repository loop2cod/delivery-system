/**
 * Solution Enquiry Page
 * Comprehensive form for potential clients to request demo and information
 */

'use client';

import React, { useState } from 'react';
import { ArrowRight, Building, Users, Truck, MapPin, Phone, Mail, Calendar, CheckCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface EnquiryForm {
  // Company Information
  companyName: string;
  industry: string;
  companySize: string;
  website: string;
  
  // Contact Information
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  
  // Business Details
  currentDeliveryVolume: string;
  currentSolution: string;
  mainChallenges: string[];
  
  // Requirements
  requiredFeatures: string[];
  timeline: string;
  budget: string;
  
  // Additional Information
  additionalInfo: string;
  demoPreference: string;
  hearAboutUs: string;
}

const industries = [
  'E-commerce & Retail',
  'Food & Beverage',
  'Healthcare & Pharmaceuticals',
  'Logistics & Transportation',
  'Manufacturing',
  'Technology',
  'Other'
];

const companySizes = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees'
];

const deliveryVolumes = [
  'Less than 100/month',
  '100-500/month',
  '500-2000/month',
  '2000-5000/month',
  '5000+ per month'
];

const challenges = [
  'Real-time tracking visibility',
  'Route optimization',
  'Driver management',
  'Customer communication',
  'Delivery cost control',
  'Analytics and reporting',
  'Integration with existing systems',
  'Scalability issues'
];

const features = [
  'Customer tracking portal',
  'Business analytics dashboard',
  'Admin control center',
  'Driver mobile app',
  'Route optimization',
  'Real-time GPS tracking',
  'QR code scanning',
  'API integrations',
  'Custom reporting',
  'Multi-location support'
];

export default function EnquiryPage() {
  const [form, setForm] = useState<EnquiryForm>({
    companyName: '',
    industry: '',
    companySize: '',
    website: '',
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    currentDeliveryVolume: '',
    currentSolution: '',
    mainChallenges: [],
    requiredFeatures: [],
    timeline: '',
    budget: '',
    additionalInfo: '',
    demoPreference: '',
    hearAboutUs: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (field: keyof EnquiryForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'mainChallenges' | 'requiredFeatures', value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      setIsSuccess(true);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-uae-light py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-white rounded-2xl shadow-xl p-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-uae-navy mb-4">
                Thank You for Your Interest!
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                We've received your enquiry and our solutions team will contact you within 24 hours 
                to schedule your personalized demo and discuss your specific requirements.
              </p>
              <div className="bg-uae-light rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-uae-navy mb-4">What happens next?</h3>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-uae-navy text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">1</div>
                    <div className="font-medium mb-1">Initial Contact</div>
                    <div className="text-gray-600">Within 24 hours</div>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-uae-navy text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">2</div>
                    <div className="font-medium mb-1">Demo Setup</div>
                    <div className="text-gray-600">Personalized presentation</div>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-uae-navy text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">3</div>
                    <div className="font-medium mb-1">Proposal</div>
                    <div className="text-gray-600">Custom solution plan</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => window.location.href = '/'}
                  className="bg-uae-navy hover:bg-blue-900 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Return to Homepage
                </button>
                <button 
                  onClick={() => window.location.href = '/track'}
                  className="border-2 border-uae-navy text-uae-navy hover:bg-uae-navy hover:text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Track a Package
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-uae-light py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-uae-navy mb-4">
              Request Your Free Demo
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tell us about your business needs and we'll show you how our delivery management 
              solution can transform your operations. Get a personalized demo tailored to your requirements.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <form onSubmit={handleSubmit}>
              {/* Company Information */}
              <div className="p-8 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-uae-navy">Company Information</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      placeholder="Your company name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry *
                    </label>
                    <select
                      required
                      value={form.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                    >
                      <option value="">Select your industry</option>
                      {industries.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Size *
                    </label>
                    <select
                      required
                      value={form.companySize}
                      onChange={(e) => handleInputChange('companySize', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                    >
                      <option value="">Select company size</option>
                      {companySizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={form.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      placeholder="https://www.yourcompany.com"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-8 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-uae-navy">Contact Information</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.jobTitle}
                      onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      placeholder="Your job title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      placeholder="your.email@company.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      placeholder="+971 50 123 4567"
                    />
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="p-8 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-uae-navy">Business Details</h2>
                </div>
                
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Delivery Volume *
                      </label>
                      <select
                        required
                        value={form.currentDeliveryVolume}
                        onChange={(e) => handleInputChange('currentDeliveryVolume', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      >
                        <option value="">Select delivery volume</option>
                        {deliveryVolumes.map(volume => (
                          <option key={volume} value={volume}>{volume}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Solution
                      </label>
                      <input
                        type="text"
                        value={form.currentSolution}
                        onChange={(e) => handleInputChange('currentSolution', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                        placeholder="What system do you currently use?"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Main Challenges (Select all that apply)
                    </label>
                    <div className="grid md:grid-cols-2 gap-3">
                      {challenges.map(challenge => (
                        <label key={challenge} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.mainChallenges.includes(challenge)}
                            onChange={() => handleArrayChange('mainChallenges', challenge)}
                            className="w-4 h-4 text-uae-navy focus:ring-uae-navy border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{challenge}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div className="p-8 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-uae-navy">Requirements</h2>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Required Features (Select all that apply)
                    </label>
                    <div className="grid md:grid-cols-2 gap-3">
                      {features.map(feature => (
                        <label key={feature} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.requiredFeatures.includes(feature)}
                            onChange={() => handleArrayChange('requiredFeatures', feature)}
                            className="w-4 h-4 text-uae-navy focus:ring-uae-navy border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Implementation Timeline
                      </label>
                      <select
                        value={form.timeline}
                        onChange={(e) => handleInputChange('timeline', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      >
                        <option value="">Select timeline</option>
                        <option value="immediate">Immediate (within 1 month)</option>
                        <option value="short">Short term (1-3 months)</option>
                        <option value="medium">Medium term (3-6 months)</option>
                        <option value="long">Long term (6+ months)</option>
                        <option value="exploring">Just exploring options</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Budget Range (AED/month)
                      </label>
                      <select
                        value={form.budget}
                        onChange={(e) => handleInputChange('budget', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      >
                        <option value="">Select budget range</option>
                        <option value="under-500">Under AED 500</option>
                        <option value="500-1000">AED 500 - 1,000</option>
                        <option value="1000-2500">AED 1,000 - 2,500</option>
                        <option value="2500-5000">AED 2,500 - 5,000</option>
                        <option value="5000-plus">AED 5,000+</option>
                        <option value="custom">Custom enterprise pricing</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="p-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Information
                    </label>
                    <textarea
                      value={form.additionalInfo}
                      onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      placeholder="Tell us more about your specific requirements, challenges, or questions..."
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Demo Preference
                      </label>
                      <select
                        value={form.demoPreference}
                        onChange={(e) => handleInputChange('demoPreference', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      >
                        <option value="">Select preference</option>
                        <option value="online">Online demo</option>
                        <option value="onsite">On-site presentation</option>
                        <option value="call">Phone consultation</option>
                        <option value="flexible">I'm flexible</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        How did you hear about us?
                      </label>
                      <select
                        value={form.hearAboutUs}
                        onChange={(e) => handleInputChange('hearAboutUs', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uae-navy focus:border-transparent"
                      >
                        <option value="">Select source</option>
                        <option value="google">Google search</option>
                        <option value="referral">Referral from colleague</option>
                        <option value="social">Social media</option>
                        <option value="event">Industry event</option>
                        <option value="partner">Business partner</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="bg-gray-50 px-8 py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-gray-600">
                    By submitting this form, you agree to our privacy policy and terms of service.
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-uae-red hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Request Demo'}
                    {!isSubmitting && <ArrowRight className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}