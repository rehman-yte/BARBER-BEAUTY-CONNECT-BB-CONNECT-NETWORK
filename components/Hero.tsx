
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const SLIDE_IMAGES = [
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1544161515-436cefb65830?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1000"
];

const Hero: React.FC = () => {
  const { isLoggedIn } = useAuth();
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
    <section className="relative w-full overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 md:px-12 bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        
        {/* LEFT: Content (STRICT BLACK & BLUE) */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-6"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.1] tracking-tight">
            <span className="text-bbBlue-deep">BARBER AND</span> <br />
            <span className="text-charcoal">BEAUTY CONNECT</span> <br />
            <span className="text-bbBlue italic">NETWORK</span>
          </h1>
          <p className="text-lg text-gray-500 mt-2 max-w-lg leading-relaxed font-medium">
            The premium ecosystem for industry-leading grooming and beauty professionals. Connection, discovery, and growth redefined.
          </p>
          
          <div className="flex flex-row gap-4 mt-6">
             <button 
                onClick={() => handleAction('/explore')}
                className="bg-bbBlue text-white px-10 py-4 rounded-full font-bold shadow-xl shadow-bbBlue/20 hover:bg-blue-600 transition-all uppercase text-xs tracking-widest text-center active:scale-95"
              >
                Start Exploring
             </button>
             <button 
                onClick={() => handleAction('/auth')}
                className="bg-transparent border-2 border-charcoal text-charcoal px-10 py-4 rounded-full font-bold hover:bg-charcoal hover:text-white transition-all uppercase text-xs tracking-widest text-center active:scale-95"
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
          <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px] lg:w-[500px] lg:h-[500px] rounded-full overflow-hidden border-4 border-gold shadow-2xl z-10 bg-white">
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
          <div className="absolute w-[350px] h-[350px] md:w-[480px] md:h-[480px] lg:w-[540px] lg:h-[540px] rounded-full border border-gray-100"></div>
          <div className="absolute w-[380px] h-[380px] md:w-[510px] md:h-[510px] lg:w-[580px] lg:h-[580px] rounded-full border border-gray-50"></div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
