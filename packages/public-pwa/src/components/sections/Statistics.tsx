/**
 * Statistics Section
 * Displays impressive metrics and achievements
 */

'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, MapPin, Clock, Star, Package, Truck, DollarSign } from 'lucide-react';

interface Statistic {
  icon: React.ComponentType<any>;
  value: string;
  label: string;
  suffix?: string;
  color: string;
  bgColor: string;
}

const statistics: Statistic[] = [
  {
    icon: Package,
    value: '500000',
    label: 'Deliveries Completed',
    suffix: '+',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Users,
    value: '50',
    label: 'Active Businesses',
    suffix: '+',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    icon: Truck,
    value: '500',
    label: 'Registered Drivers',
    suffix: '+',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    icon: MapPin,
    value: '7',
    label: 'Emirates Covered',
    suffix: '/7',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  {
    icon: Clock,
    value: '98.5',
    label: 'On-Time Delivery Rate',
    suffix: '%',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  },
  {
    icon: Star,
    value: '4.9',
    label: 'Customer Satisfaction',
    suffix: '/5',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  {
    icon: TrendingUp,
    value: '30',
    label: 'Efficiency Improvement',
    suffix: '%',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50'
  },
  {
    icon: DollarSign,
    value: '25',
    label: 'Cost Reduction',
    suffix: '%',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }
];

// Counter animation hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = (currentTime - startTime) / duration;

      if (progress < 1) {
        setCount(Math.floor(end * progress));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return { count, startAnimation: () => setHasStarted(true) };
}

function StatisticCard({ statistic, index }: { statistic: Statistic; index: number }) {
  const IconComponent = statistic.icon;
  const numericValue = parseFloat(statistic.value);
  const { count, startAnimation } = useCountUp(numericValue, 2000 + index * 200);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          startAnimation();
        }
      },
      { threshold: 0.3 }
    );

    const element = document.getElementById(`stat-${index}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [startAnimation, isVisible, index]);

  const displayValue = isVisible ? 
    (statistic.value.includes('.') ? count.toFixed(1) : count.toLocaleString()) 
    : '0';

  return (
    <div 
      id={`stat-${index}`}
      className={`${statistic.bgColor} rounded-xl p-6 text-center transform transition-all duration-700 hover:scale-105 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div className={`w-16 h-16 ${statistic.bgColor} rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg`}>
        <IconComponent className={`w-8 h-8 ${statistic.color}`} />
      </div>
      <div className={`text-3xl lg:text-4xl font-bold mb-2 ${statistic.color}`}>
        {displayValue}{statistic.suffix}
      </div>
      <div className="text-gray-700 font-medium text-sm lg:text-base">
        {statistic.label}
      </div>
    </div>
  );
}

export function Statistics() {
  return (
    <section className="py-20 bg-gradient-to-br from-uae-navy via-blue-900 to-uae-navy text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-1/4 w-64 h-64 border border-white/20 rounded-full"></div>
        <div className="absolute bottom-10 right-1/4 w-48 h-48 border border-white/20 rounded-full"></div>
        <div className="absolute top-1/2 left-10 w-32 h-32 border border-white/20 rounded-full"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Trusted by Leading UAE Businesses
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Our numbers speak for themselves. Join thousands of satisfied customers 
            who have transformed their delivery operations with our platform.
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 mb-16">
          {statistics.map((statistic, index) => (
            <StatisticCard key={index} statistic={statistic} index={index} />
          ))}
        </div>

        {/* Success Stories Highlight */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 lg:p-12 border border-white/20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Success Stories Across the UAE</h3>
            <p className="text-blue-100 text-lg">
              From small businesses to enterprise operations, our solution scales with your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Small Business */}
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-400/30">
                <Users className="w-10 h-10 text-green-400" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Small Businesses</h4>
              <div className="space-y-2 text-blue-100">
                <div className="text-2xl font-bold text-green-400">15+</div>
                <div className="text-sm">Local delivery services using our platform</div>
                <div className="text-2xl font-bold text-green-400">AED 25K</div>
                <div className="text-sm">Average annual savings</div>
              </div>
            </div>

            {/* Medium Enterprise */}
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-400/30">
                <Truck className="w-10 h-10 text-blue-400" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Medium Enterprises</h4>
              <div className="space-y-2 text-blue-100">
                <div className="text-2xl font-bold text-blue-400">25+</div>
                <div className="text-sm">Mid-size logistics companies</div>
                <div className="text-2xl font-bold text-blue-400">AED 100K</div>
                <div className="text-sm">Average annual savings</div>
              </div>
            </div>

            {/* Large Enterprise */}
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-purple-400/30">
                <TrendingUp className="w-10 h-10 text-purple-400" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Large Enterprises</h4>
              <div className="space-y-2 text-blue-100">
                <div className="text-2xl font-bold text-purple-400">10+</div>
                <div className="text-sm">Major logistics providers</div>
                <div className="text-2xl font-bold text-purple-400">AED 500K</div>
                <div className="text-sm">Average annual savings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Geographic Coverage */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-8">Complete UAE Coverage</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 
              'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'
            ].map((emirate, index) => (
              <div 
                key={emirate}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/20 transition-colors"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <MapPin className="w-6 h-6 text-uae-red mx-auto mb-2" />
                <div className="text-sm font-medium">{emirate}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}