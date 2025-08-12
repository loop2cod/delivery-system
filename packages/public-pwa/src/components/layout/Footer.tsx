'use client';

import { 
  TruckIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  WhatsAppIcon
} from '@/components/ui/SocialIcons';

const socialLinks = [
  { name: 'Facebook', href: '#', icon: FacebookIcon },
  { name: 'LinkedIn', href: '#', icon: LinkedInIcon },
  { name: 'WhatsApp', href: 'https://wa.me/971545821123', icon: WhatsAppIcon },
];

const emirates = [
  'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 
  'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                <TruckIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold">GRS Deliver</span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3">
                <PhoneIcon className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-white/90">+971545821123</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-white/90">support@grsdeliver.com</span>
              </div>
            </div>

            <div className="flex space-x-4">
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

          {/* Coverage */}
          <div className='hidden lg:block'>
            <h3 className="text-lg font-semibold mb-4">Coverage</h3>
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

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-6 text-center">
          <p className="text-sm text-white/70">
            © {currentYear} GRS Delivery Management. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}