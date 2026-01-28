
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SHOP_DATA = {
  id: 1,
  name: "The Gentleman's Cut",
  owner: "Marco Polo",
  images: [
    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1593702288070-622895dfb93a?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1517832207067-4db24a2ae47c?auto=format&fit=crop&q=80&w=800"
  ],
  services: [
    { name: "Executive Haircut", price: 45 },
    { name: "Beard Sculpture", price: 25 },
    { name: "Royal Shave", price: 35 },
    { name: "Scalp Treatment", price: 50 }
  ]
};

const ShopDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState(SHOP_DATA.services[0]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calendar Logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  // Time Slots (8 AM - 10 PM)
  const generateSlots = () => {
    const slots = [];
    for (let h = 8; h <= 21; h++) {
      slots.push(`${h}:00`);
      slots.push(`${h}:30`);
    }
    slots.push(`22:00`);
    return slots;
  };
  const allSlots = generateSlots();

  const isSlotDisabled = (slot: string) => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (!isToday) return false;

    const [hour, min] = slot.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hour, min, 0, 0);
    return new Date() > slotTime;
  };

  const handleBooking = () => {
    if (!selectedSlot) return;
    setShowPayment(true);
  };

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowPayment(false);
      navigate('/customer-dashboard');
    }, 2000);
  };

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* LEFT: Info & Gallery */}
        <div className="space-y-12">
          <header>
            <h1 className="text-5xl font-serif font-bold text-bbBlue-deep mb-4">{SHOP_DATA.name}</h1>
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-charcoal">M</div>
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Master Professional</p>
                  <p className="text-sm font-bold text-charcoal">{SHOP_DATA.owner}</p>
               </div>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-4">
             {SHOP_DATA.images.map((url, i) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                   <img src={url} className="w-full h-full object-cover" />
                </div>
             ))}
          </div>

          <div className="space-y-6">
             <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal">Available Services</h3>
             <div className="space-y-3">
                {SHOP_DATA.services.map((s, i) => (
                   <button 
                      key={i}
                      onClick={() => setSelectedService(s)}
                      className={`w-full flex justify-between items-center p-5 rounded-2xl border transition-all ${
                        selectedService.name === s.name ? 'border-bbBlue bg-bbBlue/5 shadow-inner' : 'border-gray-100 hover:border-bbBlue/30'
                      }`}
                   >
                      <span className="text-sm font-bold text-charcoal">{s.name}</span>
                      <span className="text-sm font-serif font-bold text-bbBlue">${s.price}</span>
                   </button>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT: Booking Engine */}
        <div className="space-y-10">
          <div className="p-8 md:p-12 border border-gray-100 rounded-[3rem] shadow-sm bg-gray-50/30">
             <h2 className="text-2xl font-serif font-bold text-bbBlue-deep mb-8 text-center uppercase tracking-tight">Schedule Your Slot</h2>
             
             {/* Calendar Strip */}
             <div className="space-y-4 mb-10">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Select Date</p>
                <div className="flex justify-between overflow-x-auto gap-3 pb-2 scrollbar-hide">
                   {dates.map((date, i) => {
                      const isActive = date.toDateString() === selectedDate.toDateString();
                      return (
                         <button 
                            key={i}
                            onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                            className={`flex-none w-14 py-4 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                               isActive ? 'bg-bbBlue text-white shadow-xl shadow-bbBlue/20' : 'bg-white border border-gray-100 text-charcoal hover:border-bbBlue/50'
                            }`}
                         >
                            <span className="text-[8px] font-bold uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            <span className="text-lg font-bold">{date.getDate()}</span>
                         </button>
                      );
                   })}
                </div>
             </div>

             {/* Slots Grid */}
             <div className="space-y-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Select Time (8 AM - 10 PM)</p>
                <div className="grid grid-cols-4 gap-3">
                   {allSlots.map((slot) => {
                      const disabled = isSlotDisabled(slot);
                      const isSelected = selectedSlot === slot;
                      return (
                         <button
                            key={slot}
                            disabled={disabled}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-3.5 rounded-xl text-[10px] font-bold tracking-widest transition-all ${
                               isSelected ? 'bg-bbBlue text-white shadow-lg' : 
                               disabled ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50' : 
                               'bg-white border border-gray-100 text-charcoal hover:border-bbBlue hover:text-bbBlue'
                            }`}
                         >
                            {slot}
                         </button>
                      );
                   })}
                </div>
             </div>

             <div className="mt-12 pt-10 border-t border-gray-100 flex flex-col items-center gap-6">
                <div className="text-center">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Due</p>
                   <p className="text-3xl font-serif font-bold text-bbBlue-deep">${selectedService.price}.00</p>
                </div>
                <button 
                   onClick={handleBooking}
                   disabled={!selectedSlot}
                   className="w-full py-5 bg-bbBlue text-white rounded-2xl font-bold uppercase text-xs tracking-[0.3em] shadow-2xl shadow-bbBlue/30 hover:bg-blue-600 disabled:bg-gray-200 disabled:shadow-none transition-all active:scale-[0.98]"
                >
                   Finalize Reservation
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* RAZORPAY MOCK UI */}
      <AnimatePresence>
         {showPayment && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-[1000] bg-charcoal/40 backdrop-blur-md flex items-center justify-center p-6"
            >
               <motion.div 
                  initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                  className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl"
               >
                  <div className="bg-[#1D2B44] p-8 text-white flex justify-between items-center">
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Paying To</p>
                        <p className="text-lg font-serif font-bold">{SHOP_DATA.name}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Amount</p>
                        <p className="text-2xl font-serif font-bold">${selectedService.price}</p>
                     </div>
                  </div>
                  
                  <div className="p-8 space-y-8">
                     <div className="flex flex-col items-center gap-4">
                        <div className="w-40 h-40 bg-gray-50 border-4 border-gray-50 rounded-2xl flex items-center justify-center p-4">
                           {/* Mock QR */}
                           <div className="w-full h-full bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BB_CONNECT_PAYMENT')] bg-center bg-no-repeat bg-contain opacity-80"></div>
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Scan QR to pay with any UPI App</p>
                     </div>

                     <div className="space-y-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Payment App</p>
                        <div className="grid grid-cols-2 gap-3">
                           {['GPay', 'PhonePe', 'Paytm', 'UPI ID'].map(app => (
                              <button key={app} className="py-3 border border-gray-100 rounded-xl text-[10px] font-bold text-charcoal hover:border-bbBlue transition-colors">{app}</button>
                           ))}
                        </div>
                     </div>

                     <button 
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full py-4 bg-[#2358E1] text-white rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-blue-700 active:scale-95"
                     >
                        {isProcessing ? (
                           <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Processing...
                           </>
                        ) : 'Confirm Transaction'}
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default ShopDetail;
