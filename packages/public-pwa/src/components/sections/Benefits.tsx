/**
 * Benefits Section
 * Highlights key benefits of using our delivery management solution
 */

'use client';

import React from 'react';
import { Clock, MapPin, DollarSign, Users, TrendingUp, Shield, Smartphone, Zap } from 'lucide-react';

interface Benefit {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  metric: string;
  details: string[];
}

const benefits: Benefit[] = [
  {
    icon: Clock,
    title: 'Reduce Delivery Time',
    description: 'AI-powered route optimization and real-time traffic analysis',
    metric: '30% faster deliveries',
    details: [
      'Smart route planning with live traffic data',
      'Dynamic re-routing for optimal efficiency',
      'Predictive delivery time estimates'
    ]
  },
  {
    icon: MapPin,
    title: 'GPS Accuracy',
    description: 'Sub-5-meter precision GPS tracking for reliable delivery updates',
    metric: '99.2% tracking accuracy',
    details: [
      'Real-time location updates every 30 seconds',
      'Geofencing for automated notifications',
      'Offline tracking capability'
    ]
  },
  {
    icon: DollarSign,
    title: 'Cost Reduction',
    description: 'Optimize fuel consumption and operational expenses',
    metric: '25% cost savings',
    details: [
      'Fuel-efficient route planning',
      'Reduced vehicle wear and tear',
      'Lower operational overhead'
    ]
  },
  {
    icon: Users,
    title: 'Customer Satisfaction',
    description: 'Transparent tracking and reliable delivery experience',
    metric: '98.5% satisfaction rate',
    details: [
      'Real-time delivery notifications',
      'Accurate arrival time predictions',
      '24/7 customer support integration'
    ]
  },
  {
    icon: TrendingUp,
    title: 'Business Growth',
    description: 'Scale your delivery operations with data-driven insights',
    metric: '40% capacity increase',
    details: [
      'Performance analytics and KPIs',
      'Demand forecasting capabilities',
      'Scalable infrastructure'
    ]
  },
  {
    icon: Shield,
    title: 'UAE Compliance',
    description: 'Built for UAE market with local regulations and standards',
    metric: '100% regulatory compliance',
    details: [
      'Emirates ID integration',
      'Arabic language support',
      'Local payment methods'
    ]
  }
];

export function Benefits() {
  return (
    <section className="py-20 bg-gradient-to-br from-uae-light to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-uae-navy mb-4">
            Why Choose Our Delivery Management Solution?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience measurable improvements in efficiency, cost savings, and customer satisfaction 
            with our UAE-focused delivery management platform.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <div 
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                {/* Icon and Metric */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-uae-red/10 rounded-lg flex items-center justify-center group-hover:bg-uae-red/20 transition-colors">
                    <IconComponent className="w-6 h-6 text-uae-red" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-uae-red">{benefit.metric.split(' ')[0]}</div>
                    <div className="text-xs text-gray-500">{benefit.metric.split(' ').slice(1).join(' ')}</div>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-uae-navy mb-3">{benefit.title}</h3>
                <p className="text-gray-600 mb-4">{benefit.description}</p>

                {/* Details List */}
                <ul className="space-y-2">
                  {benefit.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start gap-2 text-sm text-gray-500">
                      <div className="w-1.5 h-1.5 bg-uae-red rounded-full mt-2 flex-shrink-0"></div>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* UAE-Specific Features */}
        <div className="bg-gradient-to-r from-uae-navy to-blue-900 rounded-2xl p-8 lg:p-12 text-white">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6">Built Specifically for the UAE Market</h3>
              <p className="text-blue-100 text-lg mb-8">
                Our solution is designed with deep understanding of UAE logistics challenges, 
                regulations, and customer expectations.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-uae-red mb-1">7</div>
                  <div className="text-sm text-blue-100">Emirates Covered</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-uae-red mb-1">3</div>
                  <div className="text-sm text-blue-100">Languages Supported</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-uae-red mb-1">24/7</div>
                  <div className="text-sm text-blue-100">Local Support</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-uae-red mb-1">100%</div>
                  <div className="text-sm text-blue-100">UAE Compliant</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* UAE-Specific Features */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Arabic-English Interface</h4>
                  <p className="text-blue-100 text-sm">
                    Fully bilingual interface supporting both Arabic and English for all user roles
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Local Payment Integration</h4>
                  <p className="text-blue-100 text-sm">
                    Support for UAE payment methods including cash on delivery, credit cards, and digital wallets
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">UAE Regulatory Compliance</h4>
                  <p className="text-blue-100 text-sm">
                    Full compliance with UAE data protection, logistics regulations, and business licensing requirements
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Desert Climate Optimized</h4>
                  <p className="text-blue-100 text-sm">
                    Route planning considers UAE weather patterns, prayer times, and local traffic conditions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROI Calculator Teaser */}
        <div className="mt-16 bg-white rounded-xl p-8 shadow-lg text-center">
          <h3 className="text-2xl font-bold text-uae-navy mb-4">
            Calculate Your Potential Savings
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            See how much you could save with our delivery management solution. 
            Most businesses see ROI within 3 months of implementation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="bg-green-50 px-6 py-3 rounded-lg">
              <div className="text-xl font-bold text-green-600">AED 50,000+</div>
              <div className="text-sm text-green-700">Average Annual Savings</div>
            </div>
            <div className="bg-blue-50 px-6 py-3 rounded-lg">
              <div className="text-xl font-bold text-blue-600">3 Months</div>
              <div className="text-sm text-blue-700">Average ROI Timeline</div>
            </div>
            <div className="bg-purple-50 px-6 py-3 rounded-lg">
              <div className="text-xl font-bold text-purple-600">25%</div>
              <div className="text-sm text-purple-700">Operational Cost Reduction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}