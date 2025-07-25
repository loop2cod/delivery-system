'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline';
import { 
  TruckIcon, 
  ClockIcon, 
  ShieldCheckIcon,
  MapPinIcon 
} from '@heroicons/react/24/solid';

const stats = [
  { label: 'Packages Delivered', value: '25,000+', icon: TruckIcon },
  { label: 'Happy Customers', value: '1,200+', icon: ShieldCheckIcon },
  { label: 'Emirates Covered', value: '7/7', icon: MapPinIcon },
  { label: 'Average Delivery Time', value: '4 Hours', icon: ClockIcon },
];

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      title: 'Professional Delivery Services Across UAE',
      subtitle: 'Fast, Reliable, Tracked',
      description: 'From Dubai to Abu Dhabi, Sharjah to Fujairah - we deliver your packages safely and on time with real-time tracking.',
      cta: 'Track Package',
      ctaLink: '/track',
      image: '/images/hero-delivery-1.jpg'
    },
    {
      title: 'Same-Day Delivery for Your Business',
      subtitle: 'Business Solutions',
      description: 'Streamline your business operations with our professional B2B delivery services and dedicated account management.',
      cta: 'Get Quote',
      ctaLink: '/quote',
      image: '/images/hero-business-2.jpg'
    },
    {
      title: 'Real-Time Package Tracking',
      subtitle: 'Always Stay Informed',
      description: 'Know exactly where your package is at every step of the journey with our advanced GPS tracking system.',
      cta: 'Learn More',
      ctaLink: '/services',
      image: '/images/hero-tracking-3.jpg'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-primary">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-bounce-gentle"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-white/3 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20">
        <div className="text-center">
          {/* Main Content */}
          <div className="animate-fade-in-up">
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white backdrop-blur-sm border border-white/20">
                <TruckIcon className="w-4 h-4 mr-2" />
                {slides[currentSlide].subtitle}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 text-balance">
              {slides[currentSlide].title}
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto text-balance">
              {slides[currentSlide].description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href={slides[currentSlide].ctaLink}
                className="inline-flex items-center px-8 py-4 bg-accent text-white font-semibold rounded-2xl hover:bg-accent/90 transform hover:scale-105 transition-all duration-200 shadow-2xl"
              >
                {slides[currentSlide].cta}
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Link>
              
              <Link
                href="/inquiry"
                className="inline-flex items-center px-8 py-4 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-200"
              >
                Submit Inquiry
              </Link>
            </div>

            {/* Demo Video Button */}
            <div className="mb-16">
              <button 
                className="inline-flex items-center text-white/80 hover:text-white transition-colors duration-200 group"
                onClick={() => console.log('Play demo video')}
              >
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mr-3 group-hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm">
                  <PlayIcon className="w-6 h-6 ml-1" />
                </div>
                <span className="font-medium">Watch how it works</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto animate-fade-in-up">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className="text-center group"
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-white/70 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Slide Indicators */}
          <div className="flex justify-center space-x-2 mt-16">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentSlide 
                    ? 'bg-white' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
}