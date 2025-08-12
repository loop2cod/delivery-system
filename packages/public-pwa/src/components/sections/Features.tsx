'use client';

import { 
  MapPinIcon,
  DevicePhoneMobileIcon,
  CloudIcon,
  BellIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Real-Time GPS Tracking',
    description: 'Track your packages in real-time with our advanced GPS system. Know exactly where your delivery is at every moment.',
    icon: MapPinIcon,
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'Mobile-First Experience',
    description: 'Our Progressive Web App works seamlessly on all devices, providing a native app experience without downloads.',
    icon: DevicePhoneMobileIcon,
    color: 'from-green-500 to-green-600',
  },
  {
    name: 'Offline Capabilities',
    description: 'Continue using our service even without internet. All data syncs automatically when connection is restored.',
    icon: CloudIcon,
    color: 'from-purple-500 to-purple-600',
  },
  {
    name: 'Instant Notifications',
    description: 'Get real-time updates via SMS, email, and push notifications at every step of your delivery journey.',
    icon: BellIcon,
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    name: 'QR Code Integration',
    description: 'Quick package scanning and tracking with QR codes for streamlined pickup and delivery processes.',
    icon: QrCodeIcon,
    color: 'from-red-500 to-red-600',
  },
  {
    name: 'Secure & Insured',
    description: 'All packages are fully insured and handled with the highest security standards for complete peace of mind.',
    icon: ShieldCheckIcon,
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    name: '24/7 Operations',
    description: 'Round-the-clock service with extended business hours and emergency delivery options when you need them most.',
    icon: ClockIcon,
    color: 'from-pink-500 to-pink-600',
  },
  {
    name: 'Dedicated Support',
    description: 'Personal account managers and 24/7 customer support to ensure your delivery experience is always exceptional.',
    icon: UserGroupIcon,
    color: 'from-teal-500 to-teal-600',
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold gradient-text mb-6">
            Why Choose UAE Delivery?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience the future of delivery services with our cutting-edge technology, 
            reliable service, and customer-first approach.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <div
              key={feature.name}
              className="flex items-start space-x-6 group animate-fade-in-up"
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              {/* Feature Icon */}
              <div className="flex-shrink-0">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* Feature Content */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-200">
                  {feature.name}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}