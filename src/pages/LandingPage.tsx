import React from 'react';
import Hero from '../components/Hero';
import ProductShowcase from '../components/ProductShowcase';
import Showcase from '../components/Showcase';
import Security from '../components/Security';
import PartnerCTA from '../components/PartnerCTA';
import { motion } from 'motion/react';

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

      {/* 5. TRUST STRIP (Clean Modern Typography) */}
      <div className="py-14 md:py-16 bg-white flex flex-col items-center justify-center gap-4 border-b-2 border-black/10 select-none">
        <span className="text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-black/60">
          VERIFIED STANDARDS IN ELITE GROOMING &amp; BEAUTY
        </span>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 opacity-40 font-serif font-black text-lg md:text-2xl text-black tracking-wider">
          {['VOGUE', 'GQ', 'GLAMOUR', 'FORBES', 'HYPEBEAST'].map(brand => (
            <span key={brand} className="transition-all">{brand}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;