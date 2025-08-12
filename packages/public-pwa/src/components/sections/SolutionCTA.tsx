/**
 * Solution CTA Section
 * Final call-to-action for potential clients to get started
 */

'use client';

import React from 'react';
import { ArrowRight, Phone, Mail, MapPin, Clock, Shield, Truck } from 'lucide-react';
import Link from 'next/link';

export function SolutionCTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-uae-navy via-blue-900 to-uae-navy text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-1/4 w-64 h-64 border border-white/20 rounded-full"></div>
        <div className="absolute bottom-20 right-1/4 w-48 h-48 border border-white/20 rounded-full"></div>
        <div className="absolute top-1/2 right-10 w-32 h-32 border border-white/20 rounded-full"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Main CTA Content */}
          <div className="text-center lg:text-left">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Ready to Transform Your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-uae-red to-red-400"> Delivery Business?</span>
            </h2>
            
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Join Us. 
              Get started with a free demo and see the difference our solution can make.
            </p>

            {/* Key Benefits */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-blue-100">Quick implementation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-blue-100">24/7 support</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <div
              onClick={() => window.open('https://wa.me/971545821123?text=Hi! I need a demo of the delivery management solution.', '_blank')}
                className="bg-uae-red hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                Request Free Demo <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold mb-6 text-center">Get In Touch</h3>
            
            <div className="space-y-6">
              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Call Us</h4>
                  <p className="text-blue-100 text-sm mb-2">Speak with our solution experts</p>
                  <a href="tel:+971545821123" className="hover:text-red-300 font-medium">
                    +971 545821123
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Email Support</h4>
                  <p className="text-blue-100 text-sm mb-2">Get detailed information</p>
                  <a href="mailto:support@grsdeliver.com" className="hover:text-red-300 font-medium">
                    support@grsdeliver.com
                  </a>
                </div>
              </div>

              {/* Office */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Visit Our Office</h4>
                  <p className="text-blue-100 text-sm mb-2">Business Center</p>
                  <p className="text-blue-100 text-sm">
                    Sharjah Publishing City Free Zone<br />
                    Sharjah, United Arab Emirates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}