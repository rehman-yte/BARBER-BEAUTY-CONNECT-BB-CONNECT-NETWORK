
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquare, Send, X } from 'lucide-react';

interface RatingModalProps {
  booking: any;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({ booking, onSubmit, onClose }) => {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
    } catch (error) {
      console.error("Rating submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] bg-charcoal/60 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-charcoal z-10 transition-colors">
          <X size={24} />
        </button>

        <div className="bg-bbBlue p-10 text-white text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Star size={32} fill="white" />
          </div>
          <h2 className="text-2xl font-serif font-black uppercase tracking-tight mb-2">Rate Your Experience</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Service: {booking.serviceName || booking.service}</p>
        </div>

        <div className="p-10 space-y-8">
          <div className="space-y-4 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">How was {booking.shopName || 'the partner'}?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((idx) => (
                <button
                  key={idx}
                  onMouseEnter={() => setHoveredRating(idx)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(idx)}
                  className="transition-transform active:scale-95"
                >
                  <Star 
                    size={36} 
                    className={`transition-colors ${
                      (hoveredRating || rating) >= idx ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-[10px] font-bold text-bbBlue uppercase tracking-widest min-h-[1rem]">
              {rating === 5 ? 'Exceptional' : rating === 4 ? 'Great' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 ml-2">
              <MessageSquare size={14} className="text-gray-400" />
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Share more details</label>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about the service quality, hygiene, and behavior..."
              className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:border-bbBlue outline-none text-[12px] font-medium resize-none min-h-[100px] transition-all"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:bg-bbBlue disabled:bg-gray-200 shadow-xl shadow-bbBlue/20"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send size={16} />
                Submit Feedback
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RatingModal;
