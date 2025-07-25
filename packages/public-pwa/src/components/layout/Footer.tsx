'use client';

import Link from 'next/link';
import { 
  TruckIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import {
  FacebookIcon,
  TwitterIcon,
  InstagramIcon,
  LinkedInIcon,
  WhatsAppIcon
} from '@/components/ui/SocialIcons';

const navigation = {
  services: [
    { name: 'Same-Day Delivery', href: '/services/same-day' },
    { name: 'Document Delivery', href: '/services/documents' },
    { name: 'Express Delivery', href: '/services/express' },
    { name: 'Fragile Items', href: '/services/fragile' },
    { name: 'Inter-Emirate', href: '/services/inter-emirate' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Our Team', href: '/team' },
    { name: 'Careers', href: '/careers' },
    { name: 'Press', href: '/press' },
    { name: 'Partners', href: '/partners' },
  ],
  support: [
    { name: 'Help Center', href: '/help' },
    { name: 'Track Package', href: '/track' },
    { name: 'Contact Support', href: '/contact' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Service Status', href: '/status' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
    { name: 'Data Protection', href: '/data-protection' },
  ],
};

const socialLinks = [
  { name: 'Facebook', href: '#', icon: FacebookIcon },
  { name: 'Twitter', href: '#', icon: TwitterIcon },
  { name: 'Instagram', href: '#', icon: InstagramIcon },
  { name: 'LinkedIn', href: '#', icon: LinkedInIcon },
  { name: 'WhatsApp', href: 'https://wa.me/971800123456', icon: WhatsAppIcon },
];

const emirates = [
  'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 
  'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                  <TruckIcon className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">UAE Delivery</span>
              </div>
              
              <p className="text-white/80 mb-6 leading-relaxed">
                Professional delivery services across all emirates of UAE with real-time tracking, 
                same-day delivery, and exceptional customer service.
              </p>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <PhoneIcon className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-white/90">+971-800-123456</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-white/90">info@deliveryuae.com</span>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPinIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-white/90">
                    Business Bay, Dubai<br />
                    United Arab Emirates
                  </span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex space-x-4 mt-6">
                {socialLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-accent transition-colors duration-200"
                    target={item.name === 'WhatsApp' ? '_blank' : undefined}
                    rel={item.name === 'WhatsApp' ? 'noopener noreferrer' : undefined}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="sr-only">{item.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Services</h3>
              <ul className="space-y-3">
                {navigation.services.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-white/80 hover:text-white transition-colors duration-200"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Company</h3>
              <ul className="space-y-3">
                {navigation.company.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-white/80 hover:text-white transition-colors duration-200"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Support</h3>
              <ul className="space-y-3">
                {navigation.support.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-white/80 hover:text-white transition-colors duration-200"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coverage */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Coverage</h3>
              <p className="text-white/80 text-sm mb-4">
                We deliver to all 7 emirates:
              </p>
              <ul className="space-y-2">
                {emirates.map((emirate) => (
                  <li key={emirate} className="text-white/70 text-sm flex items-center">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full mr-2 flex-shrink-0"></div>
                    {emirate}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-white/10 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold mb-2">Stay Updated</h3>
              <p className="text-white/80 text-sm">
                Get delivery tips, service updates, and special offers
              </p>
            </div>
            
            <div className="flex w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2 rounded-l-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              <button className="px-6 py-2 bg-accent text-white font-semibold rounded-r-xl hover:bg-accent/90 transition-colors duration-200">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-white/70">
            <div className="mb-4 md:mb-0">
              <p>© {currentYear} UAE Delivery Management. All rights reserved.</p>
            </div>
            
            <div className="flex flex-wrap items-center space-x-6">
              {navigation.legal.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="hover:text-white transition-colors duration-200"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-center space-x-8 text-xs text-white/60">
              <span>✓ Dubai Municipality Approved</span>
              <span>✓ ISO 9001:2015 Certified</span>
              <span>✓ UAE Ministry Licensed</span>
              <span>✓ Fully Insured Services</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}