'use client';

import Link from 'next/link';
import { ArrowRightIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { TruckIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';

const quickActions = [
  {
    title: 'Submit Inquiry',
    description: 'Get a personalized quote for your delivery needs',
    icon: EnvelopeIcon,
    href: '/inquiry',
    primary: true,
  },
  {
    title: 'Track Package', 
    description: 'Check the status of your current deliveries',
    icon: TruckIcon,
    href: '/track',
    primary: false,
  },
  {
    title: 'Get Quote',
    description: 'Calculate delivery costs instantly',
    icon: ClockIcon,
    href: '/quote',
    primary: false,
  },
  {
    title: 'Contact Support',
    description: 'Speak with our delivery experts',
    icon: PhoneIcon,
    href: '/contact',
    primary: false,
  },
];

const benefits = [
  'Free consultation and quote',
  'Same-day setup for business accounts',
  '24/7 customer support',
  'No setup fees or hidden costs',
  'Real-time tracking included',
  'Dedicated account manager',
];

export function CTA() {
  return (
    <section className="py-24 bg-gradient-primary relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-128 h-128 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/3 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main CTA */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Experience Professional Delivery?
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
            Join over 1,200 satisfied customers who trust us with their most important deliveries across the UAE. 
            Get started today with a free consultation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/inquiry"
              className="inline-flex items-center px-8 py-4 bg-accent text-white font-semibold rounded-2xl hover:bg-accent/90 transform hover:scale-105 transition-all duration-200 shadow-2xl"
            >
              Start Your Delivery Journey
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
            
            <Link
              href="/contact"
              className="inline-flex items-center px-8 py-4 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-200"
            >
              <PhoneIcon className="w-5 h-5 mr-2" />
              Call +971-800-123456
            </Link>
          </div>

          {/* Benefits List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-16">
            {benefits.map((benefit, index) => (
              <div 
                key={benefit}
                className="flex items-center text-white/90 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-2 h-2 bg-accent rounded-full mr-3 flex-shrink-0"></div>
                <span className="text-sm font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={action.title}
              href={action.href}
              className={`group p-6 rounded-2xl backdrop-blur-sm border transition-all duration-200 hover-lift ${
                action.primary
                  ? 'bg-white/20 border-white/30 hover:bg-white/30'
                  : 'bg-white/10 border-white/20 hover:bg-white/20'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                  action.primary
                    ? 'bg-accent text-white'
                    : 'bg-white/20 text-white'
                }`}>
                  <action.icon className="w-6 h-6" />
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent transition-colors duration-200">
                  {action.title}
                </h3>
                
                <p className="text-sm text-white/80">
                  {action.description}
                </p>

                <div className="mt-4 inline-flex items-center text-white/60 group-hover:text-white transition-colors duration-200">
                  <span className="text-sm font-medium mr-2">Learn more</span>
                  <ArrowRightIcon className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-8 text-white/80">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">Fully Licensed & Insured</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <TruckIcon className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">25,000+ Successful Deliveries</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">24/7 Customer Support</span>
            </div>
          </div>

          <div className="mt-8 text-white/60 text-sm">
            <p>Trusted by leading businesses across UAE • No contracts • Cancel anytime</p>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 right-20 w-4 h-4 bg-accent rounded-full animate-pulse"></div>
      <div className="absolute bottom-20 left-20 w-6 h-6 bg-white/20 rounded-full animate-bounce-gentle"></div>
      <div className="absolute top-1/2 right-10 w-3 h-3 bg-white/30 rounded-full animate-pulse-slow"></div>
    </section>
  );
}