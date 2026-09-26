
import React from 'react';
import { motion } from 'framer-motion';

const Showcase: React.FC = () => {
  const images = [
    { url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800", label: "Precision Haircut" },
    { url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800", label: "Therapeutic Spa" },
    { url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=800", label: "Bridal & Glamour" },
    { url: "https://images.unsplash.com/photo-1593702288056-7927b442d0fa?auto=format&fit=crop&q=80&w=800", label: "Straight Razor Shave" }
  ];

  return (
    <section className="py-16 md:py-24 bg-white border-b-2 border-black/10">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold tracking-widest text-blue-600 uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>ATELIER GALLERY</span>
          </div>
          <h3 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight">
            VISUAL EXCELLENCE
          </h3>
          <p className="text-sm md:text-base text-black/70 max-w-xl mx-auto mt-2 font-medium">
            Hand-vetted craftsmanship captured across our verified barber ateliers and beauty sanctuaries.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {images.map((img, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -6 }}
              className="relative aspect-square rounded-2xl md:rounded-3xl overflow-hidden border-2 border-black shadow-[6px_6px_0px_0px_#000000] hover:shadow-[8px_8px_0px_0px_#0052FF] transition-all group bg-gray-100"
            >
              <img src={img.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={img.label} />
              <div className="absolute inset-0 bg-black/60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-xs p-4 text-center">
                <span className="text-white text-xs md:text-sm font-black uppercase tracking-widest bg-blue-600 border border-white/20 px-4 py-2 rounded-xl shadow-lg">
                  {img.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Showcase;
