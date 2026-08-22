import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import officialLogo from './offical_logoBB.jpeg';

interface SplashScreenProps {
  onComplete: () => void;
  durationSeconds?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete, 
  durationSeconds = 5 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, durationSeconds * 1000);

    return () => clearTimeout(timer);
  }, [durationSeconds, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center p-6 select-none overflow-hidden"
    >
      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
        {/* Animated Brand Logo */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-6"
        >
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 bg-white rounded-3xl p-3 shadow-xl border border-gray-100 flex items-center justify-center overflow-hidden">
            <img
              src={officialLogo}
              alt="Barber & Beauty Connect"
              className="w-full h-full object-contain rounded-2xl"
            />
          </div>
        </motion.div>

        {/* Brand Name */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="space-y-1"
        >
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-charcoal tracking-tight">
            BARBER & BEAUTY CONNECT
          </h1>
          <p className="text-[0.65rem] sm:text-[0.7rem] font-bold text-bbBlue uppercase tracking-[0.3em]">
            BB CONNECT NETWORK
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
