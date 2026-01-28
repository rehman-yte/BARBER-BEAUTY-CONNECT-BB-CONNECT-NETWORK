
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
// Fixed: Import useAuth from context/AuthContext instead of App
import { useAuth } from '../context/AuthContext';

const SLIDE_IMAGES = [
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1544161515-436cefb65830?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1000"
];

const Hero: React.FC = () => {
  // Fixed: derive isLoggedIn from user presence
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = (path: string) => {
    if (isLoggedIn) {
      navigate('/customer-dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <section className="relative w-full overflow-hidden pt-28 pb-16 lg:pt-48 lg:pb-32 px-4 md:px-12 bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-2 gap-4 md:gap-12 lg:gap-24 items-center">
        
        {/* LEFT: Content (STRICT BLACK & BLUE) */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-4 md:gap-6"
        >
          <h1 className="text-2xl sm:text-4xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.1] tracking-tight">
            <span className="text-bbBlue-deep">BARBER AND</span> <br />
            <span className="text-charcoal">BEAUTY CONNECT</span> <br />
            <span className="text-bbBlue italic">NETWORK</span>
          </h1>
          <p className="text-[10px] sm:text-xs md:text-lg text-gray-500 max-w-lg leading-relaxed font-medium">
            The premium ecosystem for industry-leading grooming and beauty professionals. Connection, discovery, and growth redefined.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-2 md:mt-6">
             <button 
                onClick={() => handleAction('/explore')}
                className="bg-bbBlue text-white px-4 md:px-10 py-2.5 md:py-4 rounded-full font-bold shadow-lg shadow-bbBlue/20 hover:bg-blue-600 transition-all uppercase text-[8px] md:text-xs tracking-widest text-center active:scale-95"
              >
                Start Exploring
             </button>
             <button 
                onClick={() => handleAction('/auth')}
                className="bg-transparent border border-charcoal md:border-2 text-charcoal px-4 md:px-10 py-2.5 md:py-4 rounded-full font-bold hover:bg-charcoal hover:text-white transition-all uppercase text-[8px] md:text-xs tracking-widest text-center active:scale-95"
              >
                Join as Partner
             </button>
          </div>
        </motion.div>

        {/* RIGHT: Circle Slider (STRICT GOLD BOUNDARY) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative flex justify-center items-center"
        >
          {/* Scaled circle container for mobile/tablet/desktop */}
          <div className="relative w-[140px] h-[140px] sm:w-[240px] sm:h-[240px] md:w-[400px] md:h-[400px] lg:w-[500px] lg:h-[500px] rounded-full overflow-hidden border-2 md:border-4 border-gold shadow-2xl z-10 bg-white">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentSlide}
                src={SLIDE_IMAGES[currentSlide]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-tr from-charcoal/20 to-transparent"></div>
          </div>
          
          {/* Subtle Accent Rings */}
          <div className="absolute w-[160px] h-[160px] sm:w-[270px] sm:h-[270px] md:w-[430px] md:h-[430px] lg:w-[540px] lg:h-[540px] rounded-full border border-gray-100"></div>
          <div className="absolute w-[180px] h-[180px] sm:w-[300px] sm:h-[300px] md:w-[460px] md:h-[460px] lg:w-[580px] lg:h-[580px] rounded-full border border-gray-50"></div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
