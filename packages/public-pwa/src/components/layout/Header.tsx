'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bars3Icon, XMarkIcon, TruckIcon } from '@heroicons/react/24/outline';
// PWA features disabled for public site

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Contact', href: '/enquiry' },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  // const { isInstalled } = usePWA();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header 
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen
          ? 'bg-white/95 backdrop-blur-lg shadow-lg'
          : 'bg-white'
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
           <img src="/logo.png" alt="Company logo" className='h-20 py-2' />
          </div>
{/* 

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-link ${
                    pathname === item.href ? 'active' : ''
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div> */}

          {/* CTA Button */}
          <div className="flex items-center space-x-4">
            <Link
              href="/inquiry"
              className="btn-primary"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          {/* <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="mobile-button inline-flex items-center justify-center rounded-xl p-2 text-foreground hover:bg-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div> */}
        </div>

        {/* Mobile Navigation */}
        {/* {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white/95 backdrop-blur-lg rounded-2xl mt-2 shadow-xl border border-border">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-xl text-base font-medium transition-colors duration-200 ${
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted hover:text-primary'
                  }`}
                  onClick={closeMobileMenu}
                >
                  {item.name}
                </Link>
              ))}
              <div className="px-3 py-2">
                <Link
                  href="/inquiry"
                  className="btn-accent w-full text-center"
                  onClick={closeMobileMenu}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )} */}
      </nav>
    </header>
  );
}