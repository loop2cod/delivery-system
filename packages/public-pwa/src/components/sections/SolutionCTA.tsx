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
              Join 50+ successful UAE businesses already using our platform. 
              Get started with a free demo and see the difference our solution can make.
            </p>

            {/* Key Benefits */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-blue-100">No setup fees</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-blue-100">Quick implementation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Truck className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-blue-100">30-day trial</span>
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
              <Link 
                href="/enquiry"
                className="bg-uae-red hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                Request Free Demo <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/track"
                className="border-2 border-white text-white hover:bg-white hover:text-uae-navy px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                Track Package
              </Link>
            </div>

            {/* Guarantee */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm text-blue-100">30-day money-back guarantee</span>
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
                  <a href="tel:+971-4-123-4567" className="text-uae-red hover:text-red-300 font-medium">
                    +971 4 123 4567
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
                  <a href="mailto:solutions@deliveryuae.com" className="text-uae-red hover:text-red-300 font-medium">
                    solutions@deliveryuae.com
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
                  <p className="text-blue-100 text-sm mb-2">Dubai Technology Park</p>
                  <p className="text-blue-100 text-sm">
                    Building A2, Office 1201<br />
                    Dubai, United Arab Emirates
                  </p>
                </div>
              </div>

              {/* Business Hours */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Business Hours</h4>
                  <p className="text-blue-100 text-sm">
                    Sunday - Thursday: 9:00 AM - 6:00 PM<br />
                    Saturday: 10:00 AM - 2:00 PM<br />
                    Friday: Closed
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-8 pt-8 border-t border-white/20">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-uae-red mb-1">< 24h</div>
                  <div className="text-xs text-blue-100">Response Time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-uae-red mb-1">98%</div>
                  <div className="text-xs text-blue-100">Client Satisfaction</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-uae-red mb-1">3 Days</div>
                  <div className="text-xs text-blue-100">Setup Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-16 text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold mb-4">Trusted by Leading UAE Companies</h3>
            <p className="text-blue-100 mb-6">
              Our solution is already helping businesses across Dubai, Abu Dhabi, and other Emirates
            </p>
            
            {/* Client Logos Placeholder */}
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-24 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-white/80">Client {i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}