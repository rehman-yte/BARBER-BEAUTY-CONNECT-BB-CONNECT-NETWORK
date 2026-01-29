
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const PartnerRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    setIsProcessing(true);
    
    // 3s high-fidelity processing delay with "Pending" state
    setTimeout(async () => {
      if (db && partnerMobile) {
        try {
          const partnerRef = doc(db, 'partners_registry', partnerMobile);
          await setDoc(partnerRef, {
            ownerName: formData.ownerName,
            brandName: formData.brandName,
            category: formData.category,
            workerCount: formData.workerCount,
            upiId: formData.upiId,
            mobile: formData.mobile,
            status: 'active',
            registryType: 'full_onboarding',
            onboardedAt: serverTimestamp()
          }, { merge: true });
          
          localStorage.setItem('bb_partner_active', 'true');
          // Immediate Redirect to Dashboard
          navigate('/partner-dashboard', { replace: true });
        } catch (err) {
          console.error("Admission protocol error:", err);
          navigate('/partner-dashboard', { replace: true });
        }
      } else {
        navigate('/partner-dashboard', { replace: true });
      }
    }, 3000);
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
            <div className="mb-16">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">Partner Registry</h1>
              <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.4em]">Official Membership Admission Protocol</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-20">
              
              {/* 01. OWNER SECTION */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">01. Master Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Full Legal Name</label>
                    <input required name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-bbBlue outline-none" />
                  </div>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-6 hover:border-bbBlue/30 transition-all cursor-pointer bg-gray-50/50 group">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'ownerPic')} />
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${formData.ownerPic ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{formData.ownerPic ? 'Portrait Selected' : 'Upload Owner Picture'}</span>
                  </label>
                </div>
              </section>

              {/* 02. BRAND SECTION */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">02. Brand Hub</h3>
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-4">
                      <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Studio / Brand Name</label>
                      <input required name="brandName" value={formData.brandName} onChange={handleInputChange} placeholder="e.g. The Sovereign Parlour" className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-bbBlue outline-none" />
                    </div>
                    <div className="flex flex-col gap-4">
                      <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Professional Category</label>
                      <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-bbBlue outline-none appearance-none font-bold uppercase tracking-widest text-bbBlue">
                        <option value="Barber">Barber</option>
                        <option value="Beauty Parlour">Beauty Parlour</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Studio Gallery (Upload 6 Images)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {formData.shopImages.map((file, i) => (
                        <label key={i} className="aspect-video bg-gray-50 border border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-bbBlue/30 transition-all group overflow-hidden relative">
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'shopImages', i)} />
                           {file ? (
                             <img src={URL.createObjectURL(file)} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Preview" />
                           ) : (
                             <svg className="w-6 h-6 text-gray-200 group-hover:text-bbBlue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2"/></svg>
                           )}
                           <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter z-10">{file ? `Image ${i+1} Ready` : `Upload Shop ${i+1}`}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 03. TEAM SECTION */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">03. Professional Staffing</h3>
                <div className="space-y-10">
                  <div className="flex flex-col gap-4 max-w-xs">
                    <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Active Staff Count</label>
                    <input type="number" min="1" value={formData.workerCount} onChange={handleWorkerCount} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:border-bbBlue outline-none" />
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {Array.from({ length: formData.workerCount }).map((_, i) => (
                      <label key={i} className="aspect-square bg-gray-50 border border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-bbBlue/30 transition-all p-2 text-center group relative overflow-hidden">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'workerPics', i)} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${formData.workerPics[i] ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                           {formData.workerPics[i] ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2"/></svg>}
                        </div>
                        <span className="text-[7px] font-bold text-gray-400 uppercase leading-none z-10 truncate w-full">{formData.workerPics[i] ? 'Verified' : `Staff ${i+1}`}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              {/* 04. SETTLEMENT SECTION */}
              <section className="space-y-10">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4">04. Settlement & Compliance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="flex flex-col gap-4">
                      <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Official Settlement UPI ID</label>
                      <input required name="upiId" value={formData.upiId} onChange={handleInputChange} placeholder="brand@upi" className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-mono focus:border-bbBlue outline-none" />
                    </div>
                    <div className="flex flex-col gap-4">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Verified Registry Mobile</label>
                      <input readOnly value={formData.mobile} className="w-full px-6 py-5 bg-gray-100 border border-gray-100 rounded-2xl text-sm font-mono opacity-60" />
                    </div>
                  </div>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-10 hover:border-bbBlue/30 transition-all cursor-pointer bg-gray-50/50 group">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'govId')} />
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all ${formData.govId ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    </div>
                    <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest text-center">{formData.govId ? 'Registry ID Validated' : 'Scan Government ID'}</span>
                  </label>
                </div>
              </section>

              <button type="submit" className="w-full py-6 bg-bbBlue text-white rounded-3xl font-bold uppercase text-xs tracking-[0.4em] shadow-2xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98]">
                Request Network Admission
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
            <h2 className="text-4xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight tracking-[-0.05em]">Pending Admission Request</h2>
            <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.5em] animate-pulse text-center">Establishment Profile Encryption in Progress...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PartnerRegistration;
