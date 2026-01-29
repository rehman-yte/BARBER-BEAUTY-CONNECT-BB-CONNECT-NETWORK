
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const PartnerRegistration: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    ownerName: user?.name || '',
    ownerPic: null as File | string | null,
    brandName: '',
    type: 'Barber',
    workerCount: 1,
    workerPics: [] as (File | string | null)[],
    upiId: '',
    mobileNumber: user?.email?.split('@')[0] || '', // Pre-fill from signup mobile-email
    shopImages: ['', '', '', '', '', ''],
    govId: null as File | string | null
  });

  const totalSteps = 4;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      workerCount: count,
      workerPics: Array(count).fill(null)
    }));
  };

  const handleFileMock = (field: string, index?: number) => {
    // In a real implementation, we would use an input type="file"
    // For this UI rebuild, we simulate an upload success with a generic icon/state
    if (typeof index === 'number') {
      const newWorkerPics = [...formData.workerPics];
      newWorkerPics[index] = 'UPLOADED';
      setFormData(prev => ({ ...prev, workerPics: newWorkerPics }));
    } else {
      setFormData(prev => ({ ...prev, [field]: 'UPLOADED' }));
    }
  };

  const handleShopImageChange = (index: number, val: string) => {
    const newImages = [...formData.shopImages];
    newImages[index] = val;
    setFormData(prev => ({ ...prev, shopImages: newImages }));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    setIsProcessing(true);
    
    // Simulate high-level security check & database entry
    setTimeout(async () => {
      if (user && db) {
        try {
          const partnerRef = doc(db, 'partners_pending', user.uid);
          await updateDoc(partnerRef, {
            ...formData,
            status: 'active', 
            updatedAt: serverTimestamp()
          });
          navigate('/partner-dashboard');
        } catch (err) {
          console.error("Registry update failure:", err);
          navigate('/partner-dashboard'); // Fallback
        }
      } else {
        navigate('/partner-dashboard');
      }
    }, 3000);
  };

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen flex justify-center items-start font-sans">
      <div className="w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {!isProcessing ? (
            <motion.div 
              key="form-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-100 p-10 md:p-16 rounded-[4rem] shadow-sm relative overflow-hidden"
            >
              {/* Progress Indicator */}
              <div className="flex justify-between items-center mb-16 px-4">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                      currentStep >= s ? 'bg-bbBlue border-bbBlue text-white shadow-lg shadow-bbBlue/20' : 'bg-white border-gray-100 text-gray-300'
                    }`}>
                      {s}
                    </div>
                    {s < 4 && <div className={`h-[1px] flex-1 mx-4 transition-all ${currentStep > s ? 'bg-bbBlue' : 'bg-gray-100'}`} />}
                  </div>
                ))}
              </div>

              {/* Step Title */}
              <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">
                  {currentStep === 1 && "Identity Verification"}
                  {currentStep === 2 && "Brand Showcase"}
                  {currentStep === 3 && "Team Registry"}
                  {currentStep === 4 && "Legal & Settlement"}
                </h1>
                <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.4em]">
                  Step {currentStep} of {totalSteps}: Onboarding Protocol
                </p>
              </div>

              {/* Step Contents */}
              <div className="min-h-[400px]">
                {currentStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                       <div className="flex flex-col gap-2">
                         <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Owner Full Name</label>
                         <input name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue transition-all" />
                       </div>
                       <div className="flex flex-col gap-2">
                         <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Verified Mobile Number</label>
                         <input readOnly value={formData.mobileNumber} className="w-full px-6 py-5 bg-gray-100 border border-gray-100 rounded-2xl text-sm outline-none font-mono cursor-not-allowed opacity-60" />
                       </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-100 rounded-[3rem] group hover:border-bbBlue/30 transition-all cursor-pointer bg-gray-50/30" onClick={() => handleFileMock('ownerPic')}>
                       <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all ${formData.ownerPic ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                         {formData.ownerPic ? (
                           <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                         ) : (
                           <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                         )}
                       </div>
                       <p className="text-[10px] font-bold text-charcoal uppercase tracking-widest">{formData.ownerPic ? "Portrait Secured" : "Upload Professional Portrait"}</p>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="flex flex-col gap-2">
                         <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Brand / Shop Name</label>
                         <input name="brandName" value={formData.brandName} onChange={handleInputChange} placeholder="The Executive Lounge" className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue transition-all" />
                       </div>
                       <div className="flex flex-col gap-2">
                          <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Industry Category</label>
                          <select name="type" value={formData.type} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none appearance-none">
                            <option value="Barber">Barber Network</option>
                            <option value="Beauty Parlour">Beauty Collective</option>
                          </select>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Shop Visual Assets (6 Required)</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                         {formData.shopImages.map((img, i) => (
                           <div key={i} className="flex flex-col gap-2">
                             <input 
                               placeholder={`URL ${i+1}`}
                               value={img}
                               onChange={(e) => handleShopImageChange(i, e.target.value)}
                               className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] outline-none focus:border-bbBlue"
                             />
                           </div>
                         ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
                    <div className="max-w-xs">
                       <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em] mb-2 block">Number of Staff Members</label>
                       <input type="number" value={formData.workerCount} onChange={handleWorkerCountChange} min="1" max="20" className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                       {Array.from({ length: formData.workerCount }).map((_, i) => (
                         <div 
                           key={i} 
                           onClick={() => handleFileMock('workerPics', i)}
                           className="aspect-square bg-gray-50 border border-gray-100 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer group hover:border-bbBlue/30 transition-all p-4 text-center"
                         >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${formData.workerPics[i] ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                               {formData.workerPics[i] ? (
                                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                               ) : (
                                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                               )}
                            </div>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Worker {i+1}<br/>Portrait</span>
                         </div>
                       ))}
                    </div>
                  </motion.div>
                )}

                {currentStep === 4 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-10">
                       <div className="flex flex-col gap-2">
                         <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em]">Settlement UPI ID</label>
                         <input name="upiId" value={formData.upiId} onChange={handleInputChange} placeholder="brand@upi" className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none font-mono focus:border-bbBlue" />
                         <p className="text-[8px] text-gray-400 font-medium">Administration payouts will be directed to this ID.</p>
                       </div>
                       
                       <div className="p-8 bg-bbBlue/5 rounded-3xl border border-bbBlue/10">
                          <h4 className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.3em] mb-4">Membership Agreement</h4>
                          <p className="text-[11px] text-gray-500 leading-relaxed">By requesting admission, you agree to the 5-minute Escrow Protocol and the Permanent Record Policy of the BB Connect Network.</p>
                       </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/30 group hover:border-bbBlue/30 transition-all cursor-pointer" onClick={() => handleFileMock('govId')}>
                       <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all ${formData.govId ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                         <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                       </div>
                       <p className="text-[10px] font-bold text-charcoal uppercase tracking-widest">{formData.govId ? "ID Scanned & Secured" : "Upload Government ID (Aadhar/PAN)"}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="mt-20 flex justify-between items-center border-t border-gray-50 pt-10">
                <button 
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={`px-10 py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${currentStep === 1 ? 'opacity-0' : 'text-gray-400 hover:text-charcoal'}`}
                >
                  Back Protocol
                </button>
                
                {currentStep < totalSteps ? (
                  <button 
                    onClick={nextStep}
                    className="px-12 py-5 bg-charcoal text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-bbBlue transition-all active:scale-[0.98]"
                  >
                    Continue Onboarding
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit}
                    className="px-12 py-5 bg-bbBlue text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] shadow-2xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98]"
                  >
                    Initiate Membership Request
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="verification-screen"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-40 text-center bg-white border border-gray-100 p-20 rounded-[4rem]"
            >
              <div className="relative w-32 h-32 mb-12">
                 <div className="absolute inset-0 border-4 border-bbBlue/10 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-12 h-12 text-bbBlue animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                 </div>
              </div>
              <h2 className="text-4xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">Global Security Registry Scan</h2>
              <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.5em] max-w-sm leading-relaxed">
                Encrypting Personal Assets and Validating Professional Credentials in real-time...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PartnerRegistration;
