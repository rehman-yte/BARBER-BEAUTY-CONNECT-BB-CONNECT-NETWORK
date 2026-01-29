
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const PartnerRegistration: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    ownerName: user?.name || '',
    ownerPic: null as string | null,
    brandName: '',
    shopImages: Array(6).fill(''),
    workerCount: 1,
    workerPics: [] as string[],
    upiId: '',
    mobile: user?.email?.split('@')[0] || '',
    govId: null as string | null
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkerCount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
    setFormData(prev => ({ 
      ...prev, 
      workerCount: count,
      workerPics: Array(count).fill('')
    }));
  };

  const handleMockUpload = (field: string, index?: number) => {
    // High-fidelity UI feedback for mock uploads
    if (typeof index === 'number') {
      const newPics = [...formData.workerPics];
      newPics[index] = 'VERIFIED_ASSET_URI';
      setFormData(prev => ({ ...prev, workerPics: newPics }));
    } else {
      setFormData(prev => ({ ...prev, [field]: 'VERIFIED_ASSET_URI' }));
    }
  };

  const handleShopImageChange = (index: number, value: string) => {
    const newImages = [...formData.shopImages];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, shopImages: newImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Cryptographic Registry Simulation (3s)
    setTimeout(async () => {
      if (user && db) {
        try {
          const partnerRef = doc(db, 'partners_pending', user.uid);
          await updateDoc(partnerRef, {
            ...formData,
            status: 'active', // Post-form status
            completedAt: serverTimestamp()
          });
          navigate('/partner-dashboard');
        } catch (err) {
          console.error("Registry submission failure:", err);
          navigate('/partner-dashboard');
        }
      } else {
        navigate('/partner-dashboard');
      }
    }, 3000);
  };

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen flex justify-center items-start">
      <AnimatePresence mode="wait">
        {!isSubmitting ? (
          <motion.div 
            key="registration-form"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl bg-white border border-gray-100 p-10 md:p-16 rounded-[4rem] shadow-sm"
          >
            <div className="mb-16">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">Professional Registry</h1>
              <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.4em]">Official Partner Onboarding Protocol</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-20">
              
              {/* Section 1: Owner Identity */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">01. Owner Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Full Legal Name</label>
                    <input required name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-bbBlue outline-none transition-all" />
                  </div>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-6 hover:border-bbBlue/30 transition-all cursor-pointer bg-gray-50/50" onClick={() => handleMockUpload('ownerPic')}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${formData.ownerPic ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200'}`}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{formData.ownerPic ? 'Portrait Secured' : 'Upload Profile Picture'}</span>
                  </div>
                </div>
              </section>

              {/* Section 2: Brand Showcase */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">02. Brand Showcase</h3>
                <div className="space-y-8">
                  <div className="flex flex-col gap-4">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Shop / Brand Name</label>
                    <input required name="brandName" value={formData.brandName} onChange={handleInputChange} placeholder="e.g. The Executive Parlour" className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-bbBlue outline-none transition-all" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Studio Gallery (6 Required URLs)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {formData.shopImages.map((img, i) => (
                        <input key={i} required placeholder={`Image URL ${i+1}`} value={img} onChange={(e) => handleShopImageChange(i, e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] focus:border-bbBlue outline-none transition-all" />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Workforce Registry */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">03. Workforce Registry</h3>
                <div className="space-y-10">
                  <div className="flex flex-col gap-4 max-w-xs">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Number of Professional Staff</label>
                    <input type="number" min="1" value={formData.workerCount} onChange={handleWorkerCount} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-bbBlue outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {Array.from({ length: formData.workerCount }).map((_, i) => (
                      <div key={i} onClick={() => handleMockUpload('workerPics', i)} className="aspect-square bg-gray-50 border border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-bbBlue/20 transition-all p-2 text-center group">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.workerPics[i] ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                           {formData.workerPics[i] ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2"/></svg>}
                        </div>
                        <span className="text-[7px] font-bold text-gray-400 uppercase">Staff {i+1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Section 4: Compliance & Finance */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">04. Compliance & Finance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="flex flex-col gap-4">
                      <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Merchant UPI ID</label>
                      <input required name="upiId" value={formData.upiId} onChange={handleInputChange} placeholder="brand@upi" className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-mono focus:border-bbBlue outline-none transition-all" />
                      <p className="text-[8px] text-gray-400 font-medium">Administration payouts will be directed to this endpoint.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Verified Mobile Number</label>
                      <input readOnly value={formData.mobile} className="w-full px-6 py-5 bg-gray-100 border border-gray-100 rounded-2xl text-sm font-mono opacity-60" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-10 hover:border-bbBlue/30 transition-all cursor-pointer bg-gray-50/50" onClick={() => handleMockUpload('govId')}>
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${formData.govId ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200'}`}>
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    </div>
                    <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest">{formData.govId ? 'ID Verified' : 'Upload Government ID'}</span>
                  </div>
                </div>
              </section>

              <button 
                type="submit"
                className="w-full py-6 bg-bbBlue text-white rounded-3xl font-bold uppercase text-xs tracking-[0.4em] shadow-2xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98]"
              >
                Initiate Membership Request
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="processing-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-40 text-center"
          >
            <div className="relative w-32 h-32 mb-12">
               <div className="absolute inset-0 border-4 border-bbBlue/10 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center text-bbBlue">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
               </div>
            </div>
            <h2 className="text-4xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">Securing Registry Assets</h2>
            <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.5em] animate-pulse">Encrypting Personal & Professional Data for verification...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PartnerRegistration;
