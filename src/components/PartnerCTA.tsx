
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import PartnerAuthModal from './PartnerAuthModal';

const PartnerCTA: React.FC = () => {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  return (
    <section className="py-16 md:py-24 bg-white border-b-2 border-black/10">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-14 border-3 border-black shadow-[10px_10px_0px_0px_#000000] hover:shadow-[14px_14px_0px_0px_#0052FF] transition-all text-center"
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-blue-600 uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>PARTNER NETWORK EXPANSION</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight mb-4">
            SCALE YOUR SALON OR PARLOUR ON <span className="text-blue-600">BB CONNECT</span>
          </h2>
          <p className="text-base md:text-lg text-black/75 max-w-2xl mx-auto mb-8 font-medium leading-relaxed">
            Join the verified marketplace for elite barbers, beauty studios, and wellness spas. Get direct bookings, automated escrow payouts, and manage staff schedules with zero hassle.
          </p>
          <button
            onClick={() => navigate('/partner-auth')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-2 border-black font-black uppercase tracking-widest text-xs sm:text-sm px-8 py-4 rounded-xl shadow-[4px_4px_0px_0px_#000000] active:scale-95 transition-all"
          >
            <span>JOIN AS A VERIFIED PARTNER</span>
            <ArrowRight className="w-4 h-4 text-white" />
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
