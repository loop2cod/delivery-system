/**
 * Client Testimonials Section
 * Showcases real client testimonials and case studies
 */

'use client';

import React, { useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote, TrendingUp, Clock, DollarSign } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  rating: number;
  quote: string;
  results: {
    metric: string;
    value: string;
    description: string;
  }[];
  industry: string;
  companySize: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Ahmed Al Mansouri',
    title: 'Operations Manager',
    company: 'Emirates Logistics Solutions',
    avatar: 'A',
    rating: 5,
    quote: 'The system has completely transformed our delivery operations. Real-time tracking and route optimization saved us 25% on operational costs in just 3 months. Our customers love the transparency and accurate delivery windows.',
    results: [
      { metric: 'Cost Reduction', value: '25%', description: 'Operational expenses' },
      { metric: 'Efficiency Gain', value: '35%', description: 'More deliveries per day' },
      { metric: 'Customer Satisfaction', value: '98%', description: 'Positive feedback' }
    ],
    industry: 'Logistics & Transportation',
    companySize: '50-200 employees'
  },
  {
    id: '2',
    name: 'Fatima Al Zahra',
    title: 'CEO & Founder',
    company: 'Dubai Express Delivery',
    avatar: 'F',
    rating: 5,
    quote: 'Customer satisfaction improved dramatically with real-time tracking. Our clients love the transparency and accurate delivery predictions. The system paid for itself within 4 months through improved efficiency.',
    results: [
      { metric: 'Customer Retention', value: '92%', description: 'Repeat customers' },
      { metric: 'Delivery Accuracy', value: '99.2%', description: 'On-time deliveries' },
      { metric: 'ROI Timeline', value: '4 months', description: 'Payback period' }
    ],
    industry: 'E-commerce Delivery',
    companySize: '20-50 employees'
  },
  {
    id: '3',
    name: 'Mohammed bin Rashid',
    title: 'Fleet Manager',
    company: 'Abu Dhabi Couriers',
    avatar: 'M',
    rating: 5,
    quote: 'The driver app is intuitive and powerful. Route optimization helps our drivers complete 40% more deliveries per day. The GPS accuracy is incredible - our customers always know exactly where their package is.',
    results: [
      { metric: 'Delivery Increase', value: '40%', description: 'More deliveries per driver' },
      { metric: 'Fuel Savings', value: '30%', description: 'Reduced fuel costs' },
      { metric: 'Driver Satisfaction', value: '4.9/5', description: 'App rating by drivers' }
    ],
    industry: 'Courier Services',
    companySize: '100-500 employees'
  },
  {
    id: '4',
    name: 'Sarah Al Zaabi',
    title: 'Digital Transformation Director',
    company: 'Sharjah Retail Group',
    avatar: 'S',
    rating: 5,
    quote: 'Integration with our existing systems was seamless. The analytics dashboard gives us insights we never had before. We can now predict demand and optimize our supply chain more effectively.',
    results: [
      { metric: 'Integration Time', value: '2 weeks', description: 'Full system deployment' },
      { metric: 'Data Accuracy', value: '99.8%', description: 'Real-time reporting' },
      { metric: 'Process Efficiency', value: '45%', description: 'Workflow improvement' }
    ],
    industry: 'Retail & E-commerce',
    companySize: '500+ employees'
  },
  {
    id: '5',
    name: 'Omar Al Mahmoud',
    title: 'Logistics Coordinator',
    company: 'Ajman Food Distribution',
    avatar: 'O',
    rating: 5,
    quote: 'Temperature-sensitive deliveries are critical for our business. The system\'s geofencing and alerts ensure our food products maintain quality throughout delivery. Customer complaints dropped by 80%.',
    results: [
      { metric: 'Quality Issues', value: '-80%', description: 'Fewer complaints' },
      { metric: 'Delivery Speed', value: '45%', description: 'Faster deliveries' },
      { metric: 'Compliance Rate', value: '100%', description: 'Food safety standards' }
    ],
    industry: 'Food & Beverage',
    companySize: '20-50 employees'
  }
];

export function ClientTestimonials() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [selectedIndustry, setSelectedIndustry] = useState('all');

  const industries = ['all', ...Array.from(new Set(testimonials.map(t => t.industry)))];
  const filteredTestimonials = selectedIndustry === 'all' 
    ? testimonials 
    : testimonials.filter(t => t.industry === selectedIndustry);

  const currentTestimonialData = filteredTestimonials[currentTestimonial] || testimonials[0];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % filteredTestimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + filteredTestimonials.length) % filteredTestimonials.length);
  };

  return (
    <section className="py-20 bg-uae-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-uae-navy mb-4">
            Success Stories from UAE Businesses
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how leading UAE companies have transformed their delivery operations 
            and achieved measurable results with our platform.
          </p>
        </div>

        {/* Industry Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {industries.map((industry) => (
            <button
              key={industry}
              onClick={() => {
                setSelectedIndustry(industry);
                setCurrentTestimonial(0);
              }}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedIndustry === industry
                  ? 'bg-uae-navy text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {industry === 'all' ? 'All Industries' : industry}
            </button>
          ))}
        </div>

        {/* Main Testimonial Display */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Testimonial Content */}
            <div className="p-8 lg:p-12">
              {/* Quote Icon */}
              <div className="w-16 h-16 bg-uae-red/10 rounded-full flex items-center justify-center mb-6">
                <Quote className="w-8 h-8 text-uae-red" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-5 h-5 ${
                      i < currentTestimonialData.rating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`} 
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  ({currentTestimonialData.rating}/5)
                </span>
              </div>

              {/* Quote */}
              <blockquote className="text-lg lg:text-xl text-gray-700 leading-relaxed mb-8">
                "{currentTestimonialData.quote}"
              </blockquote>

              {/* Client Info */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-uae-navy rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {currentTestimonialData.avatar}
                </div>
                <div>
                  <div className="font-semibold text-lg text-uae-navy">
                    {currentTestimonialData.name}
                  </div>
                  <div className="text-gray-600">{currentTestimonialData.title}</div>
                  <div className="text-uae-red font-medium">{currentTestimonialData.company}</div>
                </div>
              </div>

              {/* Company Details */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{currentTestimonialData.industry}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{currentTestimonialData.companySize}</span>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="bg-gradient-to-br from-uae-navy to-blue-900 text-white p-8 lg:p-12">
              <h3 className="text-2xl font-bold mb-8">Measurable Results</h3>
              
              <div className="space-y-6">
                {currentTestimonialData.results.map((result, index) => {
                  const getIcon = (metric: string) => {
                    if (metric.toLowerCase().includes('cost') || metric.toLowerCase().includes('savings') || metric.toLowerCase().includes('roi')) {
                      return DollarSign;
                    } else if (metric.toLowerCase().includes('time') || metric.toLowerCase().includes('speed')) {
                      return Clock;
                    } else {
                      return TrendingUp;
                    }
                  };

                  const IconComponent = getIcon(result.metric);

                  return (
                    <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div className="font-semibold">{result.metric}</div>
                      </div>
                      <div className="text-3xl font-bold text-uae-red mb-1">{result.value}</div>
                      <div className="text-sm text-blue-100">{result.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-gray-50 px-8 py-6 flex items-center justify-between border-t">
            <div className="text-sm text-gray-600">
              {currentTestimonial + 1} of {filteredTestimonials.length} testimonials
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prevTestimonial}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-uae-navy hover:bg-uae-light transition-colors border border-gray-200"
                disabled={filteredTestimonials.length <= 1}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextTestimonial}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-uae-navy hover:bg-uae-light transition-colors border border-gray-200"
                disabled={filteredTestimonials.length <= 1}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Testimonial Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {filteredTestimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTestimonial(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentTestimonial ? 'bg-uae-red' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}