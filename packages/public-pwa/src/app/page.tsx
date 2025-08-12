import { SolutionHero } from '@/components/sections/SolutionHero';
import { SystemShowcase } from '@/components/sections/SystemShowcase';
import { Features } from '@/components/sections/Features';
import { Benefits } from '@/components/sections/Benefits';
import { Statistics } from '@/components/sections/Statistics';
import { ClientTestimonials } from '@/components/sections/ClientTestimonials';
import { PricingPlans } from '@/components/sections/PricingPlans';
import { SolutionCTA } from '@/components/sections/SolutionCTA';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <SolutionHero />
        <SystemShowcase />
        <Features />
        <ClientTestimonials />
        <SolutionCTA />
      </main>
      <Footer />
    </>
  );
}