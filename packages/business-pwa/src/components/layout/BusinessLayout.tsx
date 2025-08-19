'use client';

import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';

interface BusinessLayoutProps {
  children: React.ReactNode;
}

export function BusinessLayout({ children }: BusinessLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="lg:pl-72">
        <Header setSidebarOpen={setSidebarOpen} />
        <ProfileCompletionBanner />
        
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      
      <Toaster />
    </div>
  );
}