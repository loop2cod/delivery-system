'use client';

import { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Al-Zahra',
    role: 'Operations Manager',
    company: 'Al-Manara Trading Company',
    content: 'UAE Delivery Management has transformed our business operations. Their real-time tracking and professional service ensure our important documents reach clients on time, every time. The PWA is incredibly user-friendly.',
    rating: 5,
    image: '/images/testimonials/sarah.jpg',
  },
  {
    id: 2,
    name: 'Ahmed Hassan',
    role: 'CEO',
    company: 'Emirates Tech Solutions',
    content: 'Outstanding service! We\'ve been using their delivery service for 8 months now. The reliability is exceptional, and their customer support team is always helpful. Highly recommended for any business.',
    rating: 5,
    image: '/images/testimonials/ahmed.jpg',
  },
  {
    id: 3,
    name: 'Fatima Al-Mansouri',
    role: 'Procurement Manager',
    company: 'Gulf Medical Supplies',
    content: 'Perfect for our medical supply deliveries. They handle fragile items with extra care and their insurance coverage gives us peace of mind. The tracking system is excellent - we always know where our packages are.',
    rating: 5,
    image: '/images/testimonials/fatima.jpg',
  },
  {
    id: 4,
    name: 'Omar Al-Rashid',
    role: 'Senior Delivery Driver',
    company: 'UAE Delivery Management',
    content: 'As a driver, I love working with this company. The mobile app makes my job so much easier - GPS navigation, QR scanning, and instant customer communication. Professional team and fair compensation.',
    rating: 5,
    image: '/images/testimonials/omar.jpg',
  },
  {
    id: 5,
    name: 'Mohammed Al-Ahmad',
    role: 'IT Director',
    company: 'Future Tech Industries',
    content: 'The PWA technology is impressive. It works perfectly on all our devices without needing app store downloads. The offline functionality saved us during internet outages. Truly innovative approach.',
    rating: 5,
    image: '/images/testimonials/mohammed.jpg',
  },
  {
    id: 6,
    name: 'Amira Hassan',
    role: 'Restaurant Owner',
    company: 'Golden Sands Restaurant',
    content: 'Fast and reliable delivery for our restaurant supplies. Same-day delivery within Dubai is incredible. Their customer service team is responsive and always helps resolve any issues quickly.',
    rating: 5,
    image: '/images/testimonials/amira.jpg',
  },
];

const stats = [
  { label: 'Customer Satisfaction', value: '98.5%' },
  { label: 'On-Time Delivery', value: '99.2%' },
  { label: 'Average Rating', value: '4.9/5' },
  { label: 'Return Customers', value: '89%' },
];

export function Testimonials() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlaying, testimonials.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <section id="testimonials" className="py-24 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold gradient-text mb-6">
            What Our Customers Say
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Don't just take our word for it. Here's what real customers across the UAE say about our delivery services.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              className="text-center animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
                {stat.value}
              </div>
              <div className="text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials Carousel */}
        <div className="relative">
          <div className="overflow-hidden rounded-3xl">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="w-full flex-shrink-0"
                >
                  <div className="glass-card mx-4">
                    <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-white">
                            {testimonial.name.charAt(0)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 text-center md:text-left">
                        {/* Stars */}
                        <div className="flex justify-center md:justify-start space-x-1 mb-4">
                          {[...Array(testimonial.rating)].map((_, index) => (
                            <StarIcon key={index} className="w-5 h-5 text-yellow-400" />
                          ))}
                        </div>

                        {/* Quote */}
                        <blockquote className="text-lg text-foreground mb-6 leading-relaxed">
                          "{testimonial.content}"
                        </blockquote>

                        {/* Author */}
                        <div>
                          <div className="font-bold text-foreground">
                            {testimonial.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {testimonial.role} at {testimonial.company}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors duration-200 z-10"
          >
            <ChevronLeftIcon className="w-6 h-6 text-foreground" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors duration-200 z-10"
          >
            <ChevronRightIcon className="w-6 h-6 text-foreground" />
          </button>

          {/* Indicators */}
          <div className="flex justify-center space-x-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentSlide(index);
                  setIsAutoPlaying(false);
                  setTimeout(() => setIsAutoPlaying(true), 10000);
                }}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentSlide 
                    ? 'bg-primary w-8' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-8 text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-success rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-medium">Verified Reviews</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium">1,200+ Happy Customers</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}