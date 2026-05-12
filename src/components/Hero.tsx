
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CustomerAuthModal from './CustomerAuthModal';

const SLIDE_IMAGES = [
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=1000"
];

const Hero: React.FC = () => {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { getSettings } = await import('../services/logic_engine');
        const data = await getSettings();
        setSettings(data);
      } catch (err) {
        console.debug("Settings fetch deferred or failed.");
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('auth') === 'true' && !isLoggedIn) {
      setShowAuthModal(true);
      // Capture intended path if redirected from ProtectedRoute
      if (location.state?.from) {
        setPendingPath(location.state.from);
      }
      // Clean up URL
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, isLoggedIn, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = (path: string) => {
    if (isLoggedIn) {
      navigate(path);
    } else {
      setPendingPath(path);
      setShowAuthModal(true);
    }
  };

  return (
    <section className="relative w-full overflow-hidden py-[1.5rem] md:py-[1rem] lg:py-[3rem] bg-white">
      <div className="max-w-[1440px] mx-auto px-[5%] grid grid-cols-1 md:grid-cols-2 items-center gap-[2rem] lg:gap-[4rem]">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-[1rem] md:gap-[1.5rem] text-left items-start w-full"
        >
          <h1 className="text-[1rem] sm:text-[1.25rem] md:text-[1.5rem] lg:text-[1.75rem] font-serif font-bold leading-tight tracking-tight">
            {settings?.heroTitle || (
              <>
                <span className="text-bbBlue-deep">BB</span> <span className="text-charcoal uppercase">Grooming Excellence</span>
              </>
            )}
          </h1>
          <p className="text-[0.625rem] sm:text-[0.75rem] md:text-[1rem] text-gray-500 max-w-[31.25rem] leading-relaxed font-medium">
            {settings?.heroSubtitle || "Connect with verified grooming and beauty professionals. Seamless booking, secure payments, and premium service delivery."}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-[1rem] mt-[1rem] md:mt-[1.5rem] w-full sm:w-auto">
             <button 
                onClick={() => handleAction('/customer/explore')}
                className="bg-bbBlue text-white px-[1.5rem] md:px-[2rem] py-[0.75rem] md:py-[1rem] rounded-full font-bold shadow-lg shadow-bbBlue/20 hover:bg-blue-600 transition-all uppercase text-[0.625rem] md:text-[0.75rem] tracking-widest text-center active:scale-95 w-full sm:w-auto"
              >
                Find a Salon
             </button>
             <button 
                onClick={() => handleAction('/customer-dashboard')}
                className="bg-transparent border border-charcoal md:border-2 text-charcoal px-[1.5rem] md:px-[2rem] py-[0.75rem] md:py-[1rem] rounded-full font-bold hover:bg-charcoal hover:text-white transition-all uppercase text-[0.625rem] md:text-[0.75rem] tracking-widest text-center active:scale-95 w-full sm:w-auto"
              >
                My Bookings
             </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative flex justify-center md:justify-end items-center w-full"
        >
          <div className="relative w-[14rem] h-[14rem] sm:w-[18rem] sm:h-[18rem] md:w-[20rem] md:h-[20rem] lg:w-[28rem] lg:h-[28rem] rounded-full overflow-hidden border-2 md:border-4 border-gold shadow-2xl z-10 bg-white aspect-square">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentSlide}
                src={SLIDE_IMAGES[currentSlide]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-tr from-charcoal/20 to-transparent"></div>
          </div>
          
          <div className="absolute w-[16rem] h-[16rem] sm:w-[20rem] sm:h-[20rem] md:w-[22rem] md:h-[22rem] lg:w-[30rem] lg:h-[30rem] rounded-full border border-gray-100"></div>
          <div className="absolute w-[18rem] h-[18rem] sm:w-[22rem] sm:h-[22rem] md:w-[24rem] md:h-[24rem] lg:w-[32rem] lg:h-[32rem] rounded-full border border-gray-50"></div>
        </motion.div>
      </div>

      <CustomerAuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          if (pendingPath) navigate(pendingPath);
        }}
      />
    </section>
  );
};

export default Hero;
