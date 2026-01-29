
import React from 'react';
import { motion } from 'framer-motion';

const Showcase: React.FC = () => {
  const images = [
    { url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800", label: "Haircut" },
    { url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800", label: "Spa" },
    { url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=800", label: "Makeup" },
    { url: "https://images.unsplash.com/photo-1593702288056-7927b442d0fa?auto=format&fit=crop&q=80&w=800", label: "Shave" }
  ];

  return (
    <section className="py-24 px-6 md:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.5em] mb-4">The Showcase</h2>
          <h3 className="text-3xl md:text-4xl font-serif font-bold text-charcoal">Visual Excellence</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {images.map((img, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -10 }}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg group bg-gray-50"
            >
              <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={img.label} />
              <div className="absolute inset-0 bg-bbBlue-deep/40 transition-all duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                <span className="text-white text-xs font-bold uppercase tracking-[0.3em] border-b border-white/50 pb-1">{img.label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Showcase;
