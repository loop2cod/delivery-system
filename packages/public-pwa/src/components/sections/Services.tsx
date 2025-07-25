'use client';

import { 
  TruckIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

const services = [
  {
    name: 'Same-Day Delivery',
    description: 'Get your packages delivered within the same day across UAE with our express service.',
    icon: ClockIcon,
    features: ['2-4 hour delivery', 'Real-time tracking', 'SMS notifications'],
    price: 'From AED 35',
    popular: false,
  },
  {
    name: 'Document Delivery',
    description: 'Secure handling of important documents, contracts, and legal papers.',
    icon: DocumentDuplicateIcon,
    features: ['Secure handling', 'Signature required', 'Insurance included'],
    price: 'From AED 25',
    popular: true,
  },
  {
    name: 'Express Delivery',
    description: 'Ultra-fast delivery for urgent packages with priority handling.',
    icon: TruckIcon,
    features: ['Priority handling', '1-2 hour delivery', 'Direct route'],
    price: 'From AED 50',
    popular: false,
  },
  {
    name: 'Fragile Item Delivery',
    description: 'Specialized care for delicate and valuable items with extra protection.',
    icon: ShieldCheckIcon,
    features: ['Special packaging', 'Careful handling', 'Full insurance'],
    price: 'From AED 40',
    popular: false,
  },
  {
    name: 'Inter-Emirate Delivery',
    description: 'Reliable delivery services connecting all seven emirates of UAE.',
    icon: GlobeAltIcon,
    features: ['All 7 emirates', 'Next-day delivery', 'Bulk discounts'],
    price: 'From AED 30',
    popular: false,
  },
  {
    name: 'Proof of Delivery',
    description: 'Complete delivery confirmation with photos and digital signatures.',
    icon: CameraIcon,
    features: ['Photo proof', 'Digital signature', 'GPS timestamp'],
    price: 'Included',
    popular: false,
  },
];

export function Services() {
  return (
    <section id="services" className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold gradient-text mb-6">
            Our Delivery Services
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose from our comprehensive range of delivery solutions designed to meet every need across the UAE.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={service.name}
              className={`card-hover relative ${
                service.popular ? 'ring-2 ring-accent ring-offset-4' : ''
              }`}
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              {/* Popular Badge */}
              {service.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-accent text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Service Icon */}
              <div className="mb-6">
                <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center">
                  <service.icon className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* Service Content */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {service.name}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {service.description}
                </p>

                {/* Features */}
                <ul className="space-y-2">
                  {service.features.map((feature, featureIndex) => (
                    <li 
                      key={featureIndex} 
                      className="flex items-center text-sm text-foreground"
                    >
                      <div className="w-1.5 h-1.5 bg-accent rounded-full mr-3 flex-shrink-0"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing */}
              <div className="mt-auto">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold gradient-text">
                    {service.price}
                  </span>
                  {service.price !== 'Included' && (
                    <span className="text-sm text-muted-foreground">
                      per delivery
                    </span>
                  )}
                </div>

                <button className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  service.popular
                    ? 'btn-accent'
                    : 'btn-outline'
                }`}>
                  Get Quote
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-muted/50 rounded-3xl p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Need a Custom Solution?
            </h3>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              We understand that every business has unique requirements. 
              Contact us to discuss a tailored delivery solution for your specific needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary">
                Contact Sales Team
              </button>
              <button className="btn-outline">
                Schedule Consultation
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}