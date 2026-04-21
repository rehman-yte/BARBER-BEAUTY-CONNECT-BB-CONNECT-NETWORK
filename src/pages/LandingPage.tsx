import React from 'react';
import Hero from '../components/Hero';
import ProductShowcase from '../components/ProductShowcase';
import Showcase from '../components/Showcase';
import Security from '../components/Security';
import PartnerCTA from '../components/PartnerCTA';
import { motion } from 'framer-motion';

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col relative w-full overflow-hidden bg-white">
      {/* 1. HERO SECTION (Side-by-Side Split) */}
      <Hero />

      {/* 1.5 PRODUCT SHOWCASE (Horizontal Scroll) */}
      <ProductShowcase />

      {/* 2. SHOWCASE (4-Image Grid) */}
      <Showcase />

      {/* 3. SECURITY SECTION (Badge Container) */}
      <Security />

      {/* 4. PARTNER CTA SECTION */}
      <PartnerCTA />

      {/* 5. TRUST STRIP (Subtle Gray Branding) */}
      <div className="py-24 flex flex-wrap justify-center gap-12 lg:gap-24 grayscale opacity-10 select-none pointer-events-none">
        {['VOGUE', 'GQ', 'GLAMOUR', 'FORBES', 'HYPEBEAST'].map(brand => (
          <span key={brand} className="text-2xl font-bold tracking-tighter font-serif text-charcoal">{brand}</span>
        ))}
      </div>
    </div>
  );
};

export default LandingPage;