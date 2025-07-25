/**
 * System Showcase Section
 * Showcases the four integrated PWA applications
 */

'use client';

import React, { useState } from 'react';
import { Smartphone, BarChart3, Shield, MapPin, Users, Package, Clock, TrendingUp, CheckCircle } from 'lucide-react';

interface SystemApp {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  features: string[];
  stats: { label: string; value: string }[];
}

const systemApps: SystemApp[] = [
  {
    id: 'customer',
    title: 'Customer Portal',
    description: 'Seamless package tracking and delivery requests for your customers',
    icon: Smartphone,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    features: [
      'Real-time package tracking with GPS',
      'Instant delivery request submission',
      'SMS & email notifications',
      'Delivery history and receipts',
      'Customer support chat'
    ],
    stats: [
      { label: 'Customer Satisfaction', value: '98.5%' },
      { label: 'Average Response Time', value: '< 2 min' },
      { label: 'Daily Active Users', value: '5,000+' }
    ]
  },
  {
    id: 'business',
    title: 'Business Dashboard',
    description: 'Comprehensive analytics and delivery management for business owners',
    icon: BarChart3,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    features: [
      'Revenue and performance analytics',
      'Order and delivery management',
      'Customer insights and reports',
      'Inventory tracking integration',
      'Automated billing and invoicing'
    ],
    stats: [
      { label: 'Revenue Increase', value: '+35%' },
      { label: 'Order Management', value: '1,000+/day' },
      { label: 'Business Clients', value: '200+' }
    ]
  },
  {
    id: 'admin',
    title: 'Admin Control Center',
    description: 'Complete system oversight with driver management and operational controls',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    features: [
      'Driver performance monitoring',
      'System-wide analytics and KPIs',
      'User and access management',
      'Inquiry and support management',
      'Operational efficiency reports'
    ],
    stats: [
      { label: 'System Uptime', value: '99.9%' },
      { label: 'Drivers Managed', value: '500+' },
      { label: 'Daily Operations', value: '2,000+' }
    ]
  },
  {
    id: 'driver',
    title: 'Driver Mobile App',
    description: 'Advanced GPS tracking and route optimization for delivery drivers',
    icon: MapPin,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    features: [
      'GPS navigation with 5m accuracy',
      'AI-powered route optimization',
      'QR code package scanning',
      'Digital proof of delivery',
      'Offline-first mobile experience'
    ],
    stats: [
      { label: 'Route Efficiency', value: '+30%' },
      { label: 'Delivery Accuracy', value: '99.2%' },
      { label: 'Driver Satisfaction', value: '4.8/5' }
    ]
  }
];

export function SystemShowcase() {
  const [activeApp, setActiveApp] = useState('customer');
  const currentApp = systemApps.find(app => app.id === activeApp) || systemApps[0];
  const IconComponent = currentApp.icon;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-uae-navy mb-4">
            Four Integrated Applications, One Complete Solution
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our delivery management system consists of four specialized PWA applications 
            that work seamlessly together to optimize your entire delivery operation.
          </p>
        </div>

        {/* App Navigation */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {systemApps.map((app) => {
            const AppIcon = app.icon;
            return (
              <button
                key={app.id}
                onClick={() => setActiveApp(app.id)}
                className={`p-6 rounded-xl text-left transition-all duration-300 ${
                  activeApp === app.id
                    ? `${app.bgColor} ${app.color} shadow-lg scale-105`
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  activeApp === app.id ? 'bg-white' : 'bg-white'
                }`}>
                  <AppIcon className={`w-6 h-6 ${app.color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{app.title}</h3>
                <p className="text-sm opacity-80">{app.description}</p>
              </button>
            );
          })}
        </div>

        {/* Active App Details */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 lg:p-12 shadow-xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* App Info */}
            <div>
              <div className={`inline-flex items-center gap-3 ${currentApp.bgColor} rounded-xl p-4 mb-6`}>
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                  <IconComponent className={`w-6 h-6 ${currentApp.color}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${currentApp.color}`}>{currentApp.title}</h3>
                  <p className="text-sm text-gray-600">Specialized Application</p>
                </div>
              </div>

              <p className="text-lg text-gray-700 mb-8">{currentApp.description}</p>

              {/* Features List */}
              <div className="space-y-3 mb-8">
                <h4 className="text-lg font-semibold text-uae-navy mb-4">Key Features:</h4>
                {currentApp.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* App Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {currentApp.stats.map((stat, index) => (
                  <div key={index} className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className={`text-2xl font-bold mb-1 ${currentApp.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* App Preview Mockup */}
            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 border border-gray-200">
                {/* App Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentApp.bgColor}`}>
                      <IconComponent className={`w-4 h-4 ${currentApp.color}`} />
                    </div>
                    <span className="font-semibold text-gray-800">{currentApp.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Live</span>
                  </div>
                </div>

                {/* Dynamic Content Based on Active App */}
                {activeApp === 'customer' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-900">TRK123456789</span>
                        <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">In Transit</span>
                      </div>
                      <div className="text-sm text-blue-700">
                        <div>From: Dubai Marina</div>
                        <div>To: Jumeirah Beach Residence</div>
                        <div className="flex items-center gap-1 mt-2">
                          <MapPin className="w-4 h-4" />
                          <span>5 minutes away</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <Package className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                        <div className="text-sm font-medium">Track Package</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                        <div className="text-sm font-medium">New Request</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeApp === 'business' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">247</div>
                        <div className="text-sm text-green-700">Today's Orders</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">AED 12.5K</div>
                        <div className="text-sm text-blue-700">Revenue</div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Order #ORD-1234</span>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-sm text-gray-600">Express Delivery • AED 45</div>
                      <div className="text-xs text-gray-500 mt-1">2 hours ago</div>
                    </div>
                  </div>
                )}

                {activeApp === 'admin' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-purple-600">45</div>
                        <div className="text-xs text-purple-700">Online Drivers</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-green-600">127</div>
                        <div className="text-xs text-green-700">Active Orders</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-blue-600">98.5%</div>
                        <div className="text-xs text-blue-700">Success Rate</div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-medium">Ahmed Al Mansouri</span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-auto">Online</span>
                      </div>
                      <div className="text-sm text-gray-600">3 active deliveries • 4.9★ rating</div>
                    </div>
                  </div>
                )}

                {activeApp === 'driver' && (
                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-red-900">Route Optimized</span>
                        <Clock className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="text-sm text-red-700">
                        <div>3 stops • 12.5 km • 35 min</div>
                        <div className="text-xs mt-1">25% time saved</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                        <div className="flex-1 text-sm">
                          <div className="font-medium">Dubai Marina</div>
                          <div className="text-gray-600">Package pickup</div>
                        </div>
                        <MapPin className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                        <div className="flex-1 text-sm">
                          <div className="font-medium">JBR</div>
                          <div className="text-gray-600">Delivery point</div>
                        </div>
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Notification */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white p-3 rounded-xl shadow-lg max-w-xs">
                <div className="text-sm font-semibold">System Update</div>
                <div className="text-xs opacity-90">All apps synchronized</div>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Benefits */}
        <div className="mt-16 bg-gradient-to-r from-uae-navy to-blue-900 rounded-2xl p-8 lg:p-12 text-white">
          <div className="text-center mb-8">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4">Seamless Integration Benefits</h3>
            <p className="text-blue-100 text-lg">
              All four applications work together as one unified system
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Real-Time Sync</h4>
              <p className="text-blue-100 text-sm">
                All data syncs instantly across applications for consistent experience
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Single Dashboard</h4>
              <p className="text-blue-100 text-sm">
                Manage all aspects of your delivery operation from one place
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Unified Analytics</h4>
              <p className="text-blue-100 text-sm">
                Comprehensive insights combining data from all user touchpoints
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}