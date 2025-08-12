/**
 * Solution Hero Section
 * Main hero section positioning us as the delivery management solution provider
 */

'use client';

import React from 'react';
import { ArrowRight, Play, Truck, MapPin, BarChart3, Shield } from 'lucide-react';
import Link from 'next/link';

export function SolutionHero() {
  return (
    <section className="relative bg-gradient-to-br from-uae-navy via-blue-900 to-uae-navy text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 border border-white/20 rounded-full"></div>
        <div className="absolute bottom-32 right-16 w-24 h-24 border border-white/20 rounded-full"></div>
        <div className="absolute top-1/2 right-1/4 w-16 h-16 border border-white/20 rounded-full"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              Complete
              <span className="text-transparent bg-clip-text bg-red-500"> Delivery Management</span>
              <br />
              Solution for UAE
            </h1>
            
            <p className="text-sm lg:text-xl text-blue-100 mb-8 leading-relaxed max-w-2xl">
              Transform your delivery business with our comprehensive platform. Real-time GPS tracking, 
              intelligent route optimization, and seamless customer experience—all in one solution.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Link 
                href="/enquiry"
                className="bg-uae-red hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                Request Free Demo <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20">
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold  mb-1">500K+</div>
                <div className="text-sm text-blue-200">Deliveries Managed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold  mb-1">98.5%</div>
                <div className="text-sm text-blue-200">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold  mb-1">24/7</div>
                <div className="text-sm text-blue-200">Support</div>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative">
            {/* Main Dashboard Mockup */}
            <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-2xl">
              <div className="bg-white rounded-xl p-6 text-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-uae-navy">Live Dashboard</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Live</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">127</div>
                    <div className="text-xs text-blue-500">Active Deliveries</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">45</div>
                    <div className="text-xs text-green-500">Online Drivers</div>
                  </div>
                </div>

                {/* Mini App Icons */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg text-center">
                    <Truck className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-xs text-blue-600">Customer</div>
                  </div>
                  <div className="bg-green-100 p-2 rounded-lg text-center">
                    <BarChart3 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-xs text-green-600">Business</div>
                  </div>
                  <div className="bg-purple-100 p-2 rounded-lg text-center">
                    <Shield className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                    <div className="text-xs text-purple-600">Admin</div>
                  </div>
                  <div className="bg-red-100 p-2 rounded-lg text-center">
                    <MapPin className="w-6 h-6 text-red-600 mx-auto mb-1" />
                    <div className="text-xs text-red-600">Driver</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-green-500 text-white p-3 rounded-xl shadow-lg">
              <div className="text-sm font-semibold">+15 New Orders</div>
              <div className="text-xs opacity-80">Last 5 minutes</div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-uae-red text-white p-3 rounded-xl shadow-lg">
              <div className="text-sm font-semibold">Route Optimized</div>
              <div className="text-xs opacity-80">25% time saved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
            fill="#FFFFFF"
          />
        </svg>
      </div>
    </section>
  );
}