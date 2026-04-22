
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import PartnerAuthModal from './PartnerAuthModal';

const PartnerCTA: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  return (
    <section className="py-[6rem] bg-white text-charcoal">
      <div className="max-w-[1440px] mx-auto px-[5%] text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-[50rem] mx-auto bg-gray-50 rounded-[3rem] p-[3rem] md:p-[5rem] border border-gray-100 shadow-sm"
        >
          <h2 className="text-[2rem] md:text-[3rem] font-serif font-bold text-bbBlue-deep mb-[1.5rem] uppercase tracking-tight">
            Grow Your Business with BB Connect Network
          </h2>
          <p className="text-[1rem] md:text-[1.125rem] text-gray-500 mb-[2.5rem] leading-relaxed font-medium">
            Join our elite network of Barbers and Beauty Studios. Get more bookings and manage your shop professionally.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-bbBlue-deep text-white px-[2.5rem] py-[1.25rem] rounded-full font-bold uppercase tracking-[0.3em] text-[0.75rem] shadow-xl shadow-bbBlue/20 hover:bg-charcoal transition-all active:scale-95"
          >
            JOIN AS A PARTNER
          </button>
        </motion.div>
      </div>

      <PartnerAuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
      />
    </section>
  );
};

export default PartnerCTA;
