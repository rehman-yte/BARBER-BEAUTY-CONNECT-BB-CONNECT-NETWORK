
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const PartnerRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const partnerMobile = localStorage.getItem('bb_partner_mobile') || '';
  const partnerName = localStorage.getItem('bb_partner_name') || '';

  const [formData, setFormData] = useState({
    ownerName: partnerName,
    ownerPic: null as File | string | null,
    brandName: '',
    category: 'Barber' as 'Barber' | 'Beauty Parlour',
    shopImages: Array(6).fill(null) as (File | null)[],
    workerCount: 1,
    workerPics: [] as (File | null)[],
    upiId: '',
    mobile: partnerMobile,
    govId: null as File | string | null
  });

  useEffect(() => { 
    window.scrollTo(0, 0);
    if (!partnerMobile) {
      navigate('/auth');
    }
  }, [partnerMobile, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkerCount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
    setFormData(prev => ({ 
      ...prev, 
      workerCount: count,
      workerPics: Array(count).fill(null)
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'shopImages' && typeof index === 'number') {
      const newImages = [...formData.shopImages];
      newImages[index] = file;
      setFormData(prev => ({ ...prev, shopImages: newImages }));
    } else if (field === 'workerPics' && typeof index === 'number') {
      const newPics = [...formData.workerPics];
      newPics[index] = file;
      setFormData(prev => ({ ...prev, workerPics: newPics }));
    } else {
      setFormData(prev => ({ ...prev, [field]: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // STRICT VALIDATION: Ensure mandatory text fields are not empty
    if (!formData.brandName.trim() || !formData.ownerName.trim() || !formData.upiId.trim()) {
      setError("MANDATORY FIELDS MISSING: Brand Name, Owner Name, and UPI ID are required.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsProcessing(true);
    
    if (db) {
      try {
        // MANDATORY SYNC: Mapping all fields to 'partners_registry' collection
        await addDoc(collection(db, 'partners_registry'), {
          brandName: formData.brandName.trim(),     // [BRAND NAME]
          ownerName: formData.ownerName.trim(),     // [OWNER]
          category: formData.category,               // [CATEGORY]
          workers: formData.workerCount,             // [WORKERS]
          upiId: formData.upiId.trim(),
          mobile: formData.mobile || partnerMobile,
          status: 'pending',                         // STRICT: Hardcoded pending status
          isVerified: false,                         // STRICT: Default verification state
          createdAt: serverTimestamp(),              // [CREATED AT]
          onboardedAt: serverTimestamp()             // Compatibility with legacy ExplorePage ordering
        });
        
        localStorage.setItem('bb_partner_active', 'true');
        
        // 3s high-fidelity processing delay before redirect to dashboard
        setTimeout(() => {
          navigate('/partner-dashboard', { replace: true });
        }, 3000);
      } catch (err) {
        console.error("Admission registry write failed:", err);
        setError("NETWORK ERROR: Secure Registry sync failed. Please check connection.");
        setIsProcessing(false);
      }
    } else {
      setIsProcessing(false);
      setError("SYSTEM OFFLINE: Registry connection unavailable.");
    }
  };

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen flex justify-center items-start overflow-y-auto">
      <AnimatePresence mode="wait">
        {!isProcessing ? (
          <motion.div 
            key="registration-form"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl bg-white border border-gray-100 p-10 md:p-16 rounded-[4rem] shadow-sm mb-10"
          >
            <div className="mb-16 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">Partner Registry</h1>
              <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.4em]">Establish Professional Identity</p>
              {error && <p className="mt-6 text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-20">
              
              {/* 01. IDENTITY */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">01. Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Full Owner Name</label>
                    <input required name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue" />
                  </div>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-6 cursor-pointer bg-gray-50/50 hover:border-bbBlue/30 transition-all group">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'ownerPic')} />
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${formData.ownerPic ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{formData.ownerPic ? 'Captured' : 'Upload Picture'}</span>
                  </label>
                </div>
              </section>

              {/* 02. SHOP HUB */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">02. Shop Hub</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Brand Name</label>
                    <input required name="brandName" value={formData.brandName} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold uppercase tracking-widest text-bbBlue outline-none">
                       <option value="Barber">Barber</option>
                       <option value="Beauty Parlour">Beauty Parlour</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Shop Gallery (Upload 6 Photos)</label>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {formData.shopImages.map((file, i) => (
                      <label key={i} className="aspect-square bg-gray-50 border border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-bbBlue/30 transition-all overflow-hidden relative">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'shopImages', i)} />
                        {file ? (
                          <img src={URL.createObjectURL(file)} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />
                        ) : (
                          <svg className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2"/></svg>
                        )}
                        <span className="text-[6px] font-bold text-gray-400 uppercase z-10">{file ? `Shop ${i+1}` : 'Upload'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                   <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Estimated Workers</label>
                   <input type="number" name="workerCount" min="1" max="30" value={formData.workerCount} onChange={handleWorkerCount} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-mono outline-none focus:border-bbBlue" />
                </div>
              </section>

              {/* 03. SETTLEMENTS */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">03. Settlements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">UPI ID for Payments</label>
                    <input required name="upiId" value={formData.upiId} onChange={handleInputChange} placeholder="brand@upi" className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-mono outline-none focus:border-bbBlue" />
                  </div>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-6 cursor-pointer bg-gray-50/50 hover:border-bbBlue/30 transition-all group">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'govId')} />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${formData.govId ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{formData.govId ? 'ID Scanned' : 'Scan Gov ID'}</span>
                  </label>
                </div>
              </section>

              <button type="submit" className="w-full py-6 bg-bbBlue text-white rounded-3xl font-bold uppercase text-xs tracking-[0.4em] shadow-2xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98]">
                Request Network Admission
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="pending" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-40 text-center">
            <div className="relative w-32 h-32 mb-12">
               <div className="absolute inset-0 border-4 border-bbBlue/10 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center text-bbBlue">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
               </div>
            </div>
            <h2 className="text-4xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">Pending Admission</h2>
            <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.5em] animate-pulse">Syncing Professional Identity with Admin Verification Hub...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PartnerRegistration;
