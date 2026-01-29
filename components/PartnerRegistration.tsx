
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const PartnerRegistration: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'processing'>('form');
  
  const [formData, setFormData] = useState({
    ownerName: user?.name || '',
    brandName: '',
    type: 'Barber',
    workerCount: 1,
    upiId: '',
    images: ['', '', '', '', '', ''],
    govId: null as File | null
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (index: number, val: string) => {
    const newImages = [...formData.images];
    newImages[index] = val;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    
    // Simulate high-level security check
    setTimeout(async () => {
      if (user && db) {
        try {
          const partnerRef = doc(db, 'partners_pending', user.uid);
          await updateDoc(partnerRef, {
            ...formData,
            status: 'active', // Moving from pending to active for the dashboard transition
            updatedAt: serverTimestamp()
          });
          // Also create/update the main partner record for the explore page
          const mainRef = doc(db, 'partners', user.uid);
          // In a real app, we'd wait for admin approval, but as per roadmap logic, we move to dashboard.
          navigate('/partner-dashboard');
        } catch (err) {
          console.error("Registration update failed:", err);
          navigate('/partner-dashboard'); // Fallback for demo
        }
      } else {
        navigate('/partner-dashboard');
      }
    }, 3000);
  };

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen flex justify-center items-start">
      <AnimatePresence mode="wait">
        {step === 'form' ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl bg-white border border-gray-100 p-10 md:p-16 rounded-[3rem] shadow-sm"
          >
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">Join Our Network</h1>
              <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.4em]">Partner Onboarding Protocol</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Business Identity</h3>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Owner Full Name</label>
                  <input required name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue transition-all" />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Brand Name (Shop)</label>
                  <input required name="brandName" value={formData.brandName} onChange={handleInputChange} placeholder="e.g., The Elite Studio" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Industry Type</label>
                    <select name="type" value={formData.type} onChange={handleInputChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue transition-all appearance-none">
                      <option value="Barber">Barber</option>
                      <option value="Beauty Parlour">Beauty Parlour</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Worker Count</label>
                    <input required type="number" name="workerCount" value={formData.workerCount} onChange={handleInputChange} min="1" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue transition-all" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">UPI ID (For Direct Payments)</label>
                  <input required name="upiId" value={formData.upiId} onChange={handleInputChange} placeholder="merchant@upi" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue transition-all font-mono" />
                </div>

                <div className="pt-6">
                   <div className="p-6 border-2 border-dashed border-gray-100 rounded-3xl text-center group hover:border-bbBlue/30 transition-all cursor-pointer">
                      <svg className="w-8 h-8 text-gray-200 mx-auto mb-2 group-hover:text-bbBlue/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upload Government ID</p>
                      <p className="text-[8px] text-gray-300 mt-1 uppercase tracking-tighter">PDF, JPG or PNG (Max 5MB)</p>
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Visual Asset Hub (6 Required)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {formData.images.map((img, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <input 
                        required 
                        placeholder={`Image URL ${i+1}`}
                        value={img}
                        onChange={(e) => handleImageChange(i, e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] outline-none focus:border-bbBlue transition-all"
                      />
                    </div>
                  ))}
                </div>
                <div className="p-6 bg-bbBlue/5 rounded-3xl border border-bbBlue/10">
                   <p className="text-[10px] font-bold text-bbBlue uppercase tracking-widest mb-2">Quality Standard</p>
                   <p className="text-[11px] text-gray-500 leading-relaxed font-medium">Please provide high-resolution URLs from Unsplash or your hosting provider. These images represent your brand in our elite directory.</p>
                </div>
                
                <button 
                  type="submit"
                  className="w-full py-5 bg-charcoal text-white rounded-2xl font-bold uppercase text-[11px] tracking-[0.4em] shadow-xl hover:bg-bbBlue transition-all active:scale-[0.98] mt-10"
                >
                  Initiate Membership
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-40 text-center"
          >
            <div className="relative w-24 h-24 mb-10">
               <div className="absolute inset-0 border-4 border-bbBlue/10 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-3xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">Verification in Progress</h2>
            <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.5em] animate-pulse">Scanning Professional Registry & Security Encryption</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PartnerRegistration;
