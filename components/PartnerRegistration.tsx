
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

  const performRegistrySync = async (retryCount = 0): Promise<void> => {
    if (!db) throw new Error("FIREBASE_DB_NOT_INITIALIZED");

    // Get the unique identifier for the partner document
    // Using partnerMobile as the primary ID to ensure it matches the lookup in ShopDetail/Dashboards
    const documentId = partnerMobile; 

    if (!documentId) throw new Error("IDENTIFIER_MISSING: Partner mobile not found in session.");

    try {
      console.log(`Sync Attempt ${retryCount + 1}: Force Writing to Registry [ID: ${documentId}]...`);
      
      // STRICT FIELD MAPPING AS PER INSTRUCTIONS
      const registryPayload = {
        brandName: formData.brandName.trim(),     // [BRAND NAME]
        ownerName: formData.ownerName.trim(),     // [OWNER]
        category: formData.category,               // [CATEGORY]
        workers: formData.workerCount,             // [WORKERS]
        upiId: formData.upiId.trim(),              // [UPI ID]
        mobile: partnerMobile,                     // [MOBILE]
        status: 'pending',                         // STRICT: Hardcoded status
        isVerified: false,                         // STRICT: Default False
        createdAt: serverTimestamp(),              // [TIMESTAMP]
        onboardedAt: serverTimestamp(),            // Legacy compatibility
        platformVersion: '2.6.0-final-fix'
      };

      // USE setDoc to tie data to the specific mobile/uid ID
      await setDoc(doc(db, 'partners_registry', documentId), registryPayload);
      
      console.log("Registry Sync SUCCESS: Professional data committed.");
      
      // Keep loader active for visual confirmation as requested
      localStorage.setItem('bb_partner_active', 'true');
      
      // 3s delay before final redirect to dashboard
      await new Promise(resolve => setTimeout(resolve, 3000));
      navigate('/partner-dashboard', { replace: true });

    } catch (err: any) {
      console.error("CRITICAL REGISTRY SYNC ERROR:", {
        code: err.code,
        message: err.message,
        details: err
      });

      if (retryCount < 1) {
        console.warn("Retrying sync operation...");
        return performRegistrySync(retryCount + 1);
      }
      
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.brandName.trim() || !formData.ownerName.trim() || !formData.upiId.trim()) {
      setError("MANDATORY FIELDS MISSING: Brand Name, Owner Name, and UPI ID are required.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsProcessing(true);
    
    try {
      await performRegistrySync();
      // Loader is closed by the redirect in performRegistrySync on success
    } catch (err: any) {
      setIsProcessing(false); // Only close loader on failure
      setError(`CRITICAL: Registry Sync Failed [${err.code || 'UNKNOWN'}]. Check your network or Admin permissions.`);
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
              {error && (
                <div className="mt-6 bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Protocol Sync Failure</p>
                  <p className="text-[11px] font-medium text-red-600">{error}</p>
                </div>
              )}
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
            <h2 className="text-4xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">Syncing Registry</h2>
            <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.5em] animate-pulse">Establishing Secure Handshake with Global Admission Hub...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PartnerRegistration;
