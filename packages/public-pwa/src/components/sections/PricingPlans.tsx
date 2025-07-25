/**
 * Pricing Plans Section
 * Displays flexible pricing options for different business sizes
 */

'use client';

import React, { useState } from 'react';
import { Check, X, Star, Zap, Building, Truck, ArrowRight, Calculator } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  popular?: boolean;
  price: {
    monthly: number;
    yearly: number;
  };
  features: {
    included: string[];
    excluded: string[];
  };
  limits: {
    deliveries: string;
    drivers: string;
    users: string;
    storage: string;
  };
  support: string;
  setup: string;
  color: string;
  bgColor: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small businesses just getting started with delivery management',
    icon: Truck,
    price: {
      monthly: 299,
      yearly: 2990
    },
    features: {
      included: [
        'Customer tracking portal',
        'Basic route optimization',
        'Real-time GPS tracking',
        'SMS notifications',
        'Basic analytics dashboard',
        'Mobile driver app',
        'QR code scanning',
        'Email support'
      ],
      excluded: [
        'Advanced analytics',
        'Custom integrations',
        'Dedicated account manager',
        'White-label options'
      ]
    },
    limits: {
      deliveries: 'Up to 500/month',
      drivers: 'Up to 5 drivers',
      users: 'Up to 10 users',
      storage: '10 GB'
    },
    support: 'Email support (24-48h response)',
    setup: 'Self-setup with documentation',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal for growing businesses with increased delivery volume and advanced needs',
    icon: Building,
    popular: true,
    price: {
      monthly: 599,
      yearly: 5990
    },
    features: {
      included: [
        'Everything in Starter',
        'Advanced route optimization',
        'Business analytics dashboard',
        'API access & integrations',
        'Custom notifications',
        'Geofencing capabilities',
        'Performance reports',
        'Priority support',
        'Team management',
        'Multi-location support'
      ],
      excluded: [
        'White-label options',
        'Dedicated account manager',
        'Custom development'
      ]
    },
    limits: {
      deliveries: 'Up to 2,000/month',
      drivers: 'Up to 20 drivers',
      users: 'Up to 50 users',
      storage: '100 GB'
    },
    support: 'Priority support (4-8h response)',
    setup: 'Assisted setup & training',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Comprehensive solution for large organizations with custom requirements',
    icon: Zap,
    price: {
      monthly: 1299,
      yearly: 12990
    },
    features: {
      included: [
        'Everything in Professional',
        'Custom integrations',
        'Advanced analytics & BI',
        'White-label options',
        'Dedicated account manager',
        'Custom workflows',
        'Advanced security features',
        'SLA guarantees',
        'Custom training',
        '24/7 phone support',
        'Unlimited API calls',
        'Priority feature requests'
      ],
      excluded: []
    },
    limits: {
      deliveries: 'Unlimited',
      drivers: 'Unlimited',
      users: 'Unlimited',
      storage: '1 TB'
    },
    support: '24/7 dedicated support',
    setup: 'Full implementation service',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  }
];

const addOns = [
  {
    name: 'Additional Driver Licenses',
    price: 'AED 25/driver/month',
    description: 'Add more drivers to your plan'
  },
  {
    name: 'Extra Storage',
    price: 'AED 0.50/GB/month',
    description: 'Additional storage for photos and documents'
  },
  {
    name: 'Advanced Analytics',
    price: 'AED 199/month',
    description: 'Detailed business intelligence and reporting'
  },
  {
    name: 'Custom Integration',
    price: 'From AED 2000',
    description: 'One-time setup for third-party integrations'
  }
];

export function PricingPlans() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState('professional');

  const calculateSavings = (monthly: number, yearly: number) => {
    const monthlyCost = monthly * 12;
    const savings = monthlyCost - yearly;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return { savings, percentage };
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-uae-navy mb-4">
            Flexible Pricing for Every Business Size
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Choose the perfect plan for your delivery business. All plans include 
            our core features with no setup fees and 30-day money-back guarantee.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-uae-navy shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors relative ${
                billingCycle === 'yearly'
                  ? 'bg-white text-uae-navy shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-uae-red text-white text-xs px-2 py-1 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 mb-16">
          {pricingPlans.map((plan) => {
            const IconComponent = plan.icon;
            const { savings, percentage } = calculateSavings(plan.price.monthly, plan.price.yearly);
            const currentPrice = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const isSelected = selectedPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${
                  plan.popular ? 'ring-2 ring-uae-red scale-105' : 'hover:scale-105'
                } ${isSelected ? 'ring-2 ring-uae-navy' : ''}`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-uae-red to-red-600 text-white text-center py-2 text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                <div className={`p-8 ${plan.popular ? 'pt-12' : ''}`}>
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <div className={`w-16 h-16 ${plan.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <IconComponent className={`w-8 h-8 ${plan.color}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-uae-navy mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                    
                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-4xl font-bold text-uae-navy">
                          AED {currentPrice.toLocaleString()}
                        </span>
                        <span className="text-gray-500">
                          /{billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <div className="text-sm text-green-600 mt-1">
                          Save AED {savings.toLocaleString()} ({percentage}%)
                        </div>
                      )}
                    </div>

                    {/* Limits */}
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>{plan.limits.deliveries}</div>
                      <div>{plan.limits.drivers} • {plan.limits.users}</div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    <h4 className="font-semibold text-uae-navy">What's included:</h4>
                    <ul className="space-y-3">
                      {plan.features.included.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.features.excluded.length > 0 && (
                      <ul className="space-y-3 pt-4 border-t border-gray-100">
                        {plan.features.excluded.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <X className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-400">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Support & Setup */}
                  <div className="text-sm text-gray-600 mb-8 space-y-2">
                    <div><strong>Support:</strong> {plan.support}</div>
                    <div><strong>Setup:</strong> {plan.setup}</div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-uae-red hover:bg-red-700 text-white shadow-lg'
                        : isSelected
                        ? 'bg-uae-navy hover:bg-blue-900 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    {plan.popular ? 'Start Free Trial' : 'Get Started'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add-ons Section */}
        <div className="bg-gray-50 rounded-2xl p-8 lg:p-12 mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-uae-navy mb-4">Optional Add-ons</h3>
            <p className="text-gray-600">Enhance your plan with additional features and capacity</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {addOns.map((addon, index) => (
              <div key={index} className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-uae-navy mb-2">{addon.name}</h4>
                <div className="text-2xl font-bold text-uae-red mb-2">{addon.price}</div>
                <p className="text-sm text-gray-600">{addon.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold text-uae-navy mb-8">Frequently Asked Questions</h3>
          
          <div className="grid md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
            <div>
              <h4 className="font-semibold text-uae-navy mb-2">Can I change plans anytime?</h4>
              <p className="text-gray-600 text-sm">Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-uae-navy mb-2">Is there a setup fee?</h4>
              <p className="text-gray-600 text-sm">No setup fees for any plan. We include onboarding and training to get you started quickly.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-uae-navy mb-2">What payment methods do you accept?</h4>
              <p className="text-gray-600 text-sm">We accept all major credit cards, bank transfers, and UAE-specific payment methods.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-uae-navy mb-2">Do you offer custom enterprise solutions?</h4>
              <p className="text-gray-600 text-sm">Yes, we can customize the Enterprise plan for large organizations with specific requirements.</p>
            </div>
          </div>
        </div>

        {/* ROI Calculator CTA */}
        <div className="bg-gradient-to-r from-uae-navy to-blue-900 rounded-2xl p-8 lg:p-12 text-white text-center">
          <div className="max-w-3xl mx-auto">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-3xl font-bold mb-4">Calculate Your ROI</h3>
            <p className="text-blue-100 text-lg mb-8">
              See how much you could save with our delivery management solution. 
              Most businesses see ROI within 3-4 months.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-uae-navy hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
                ROI Calculator
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-uae-navy px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>

        {/* Money-back Guarantee */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-3 bg-green-50 text-green-800 px-6 py-3 rounded-full">
            <Star className="w-5 h-5" />
            <span className="font-medium">30-day money-back guarantee on all plans</span>
          </div>
        </div>
      </div>
    </section>
  );
}