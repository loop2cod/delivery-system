'use client';

import { CheckIcon } from '@heroicons/react/24/solid';
import { MapPinIcon } from '@heroicons/react/24/outline';

const emirates = [
  {
    name: 'Dubai',
    code: 'DXB',
    zones: ['Downtown', 'Marina', 'JLT', 'Business Bay', 'DIFC', 'Jumeirah'],
    deliveryTime: '2-4 hours',
    featured: true,
  },
  {
    name: 'Abu Dhabi',
    code: 'AUH', 
    zones: ['Khalifa City', 'Al Reem', 'Yas Island', 'Saadiyat', 'Downtown'],
    deliveryTime: '3-5 hours',
    featured: true,
  },
  {
    name: 'Sharjah',
    code: 'SHJ',
    zones: ['Al Majaz', 'Al Qasba', 'Rolla', 'Industrial Area'],
    deliveryTime: '2-4 hours',
    featured: false,
  },
  {
    name: 'Ajman',
    code: 'AJM',
    zones: ['Corniche', 'Industrial', 'Residential'],
    deliveryTime: '3-5 hours',
    featured: false,
  },
  {
    name: 'Ras Al Khaimah',
    code: 'RAK',
    zones: ['Al Nakheel', 'Old Town', 'Industrial'],
    deliveryTime: '4-6 hours',
    featured: false,
  },
  {
    name: 'Fujairah',
    code: 'FJR',
    zones: ['City Center', 'Port Area', 'Beach Resort'],
    deliveryTime: '5-7 hours',
    featured: false,
  },
  {
    name: 'Umm Al Quwain',
    code: 'UAQ',
    zones: ['Old Town', 'Marina', 'Industrial'],
    deliveryTime: '4-6 hours',
    featured: false,
  },
];

const coverageStats = [
  { label: 'Emirates Covered', value: '7/7' },
  { label: 'Cities & Areas', value: '45+' },
  { label: 'Coverage Area', value: '83,600 km²' },
  { label: 'Population Served', value: '9.8M+' },
];

export function Coverage() {
  return (
    <section id="coverage" className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold gradient-text mb-6">
            Complete UAE Coverage
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We deliver to all seven emirates of the UAE, ensuring your packages reach every corner of the country with reliable and timely service.
          </p>
        </div>

        {/* Coverage Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {coverageStats.map((stat, index) => (
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

        {/* Emirates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {emirates.map((emirate, index) => (
            <div
              key={emirate.code}
              className={`card-hover ${
                emirate.featured ? 'ring-2 ring-accent ring-offset-4' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Emirates Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <MapPinIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{emirate.name}</h3>
                    <span className="text-sm text-muted-foreground">{emirate.code}</span>
                  </div>
                </div>
                {emirate.featured && (
                  <span className="bg-accent text-white px-2 py-1 rounded-full text-xs font-semibold">
                    Popular
                  </span>
                )}
              </div>

              {/* Delivery Time */}
              <div className="mb-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <span className="text-sm font-medium text-foreground">Delivery Time</span>
                  <span className="text-sm font-bold text-accent">{emirate.deliveryTime}</span>
                </div>
              </div>

              {/* Coverage Zones */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Coverage Areas ({emirate.zones.length})
                </h4>
                <div className="space-y-2">
                  {emirate.zones.map((zone, zoneIndex) => (
                    <div key={zone} className="flex items-center text-sm">
                      <CheckIcon className="w-4 h-4 text-success mr-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{zone}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map Placeholder & CTA */}
        <div className="bg-muted/20 rounded-3xl p-8 md:p-12 text-center">
          <div className="mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Interactive Coverage Map
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Explore our detailed coverage map to see exact delivery zones, 
              estimated delivery times, and service availability in your area.
            </p>
          </div>

          {/* Map Placeholder */}
          <div className="bg-gradient-primary rounded-2xl h-64 md:h-80 flex items-center justify-center mb-8">
            <div className="text-center text-white">
              <MapPinIcon className="w-16 h-16 mx-auto mb-4 opacity-80" />
              <p className="text-lg font-semibold mb-2">Interactive Map Coming Soon</p>
              <p className="text-sm opacity-80">Detailed coverage visualization</p>
            </div>
          </div>

          {/* Coverage Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckIcon className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">100% Coverage</h4>
              <p className="text-sm text-muted-foreground">All emirates and major areas covered</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-success rounded-xl flex items-center justify-center mx-auto mb-3">
                <MapPinIcon className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">GPS Precision</h4>
              <p className="text-sm text-muted-foreground">Accurate location tracking</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckIcon className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Same-Day Service</h4>
              <p className="text-sm text-muted-foreground">Fast delivery within emirates</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-primary">
              Check Your Area
            </button>
            <button className="btn-outline">
              View Full Coverage Details
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}