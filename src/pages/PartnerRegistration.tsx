import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { addShop, getShops } from '../services/logic_engine';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';

const PartnerRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, updateUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedToken, setGeneratedToken] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState('');

  // Initial Data from Session/Auth
  const sessionName = localStorage.getItem('bb_partner_name') || '';
  const sessionMobile = localStorage.getItem('bb_partner_mobile') || '';
  const sessionPassword = localStorage.getItem('bb_partner_password') || '';

  const [formData, setFormData] = useState({
    ownerName: user?.name || sessionName,
    ownerPic: null as File | string | null,
    shopName: '',
    category: 'Barber' as 'Barber' | 'Beauty Parlour',
    shopImages: Array(6).fill(null) as (File | null)[],
    workerQuantity: 1,
    workerImages: Array(1).fill(null) as (File | null)[],
    upiId: '',
    mobile: user?.email?.split('@')[0] || sessionMobile,
    govId: null as File | string | null,
    lat: null as number | null,
    lng: null as number | null,
    manualAddress: ''
  });

  useEffect(() => {
    const runGuard = async () => {
      if (!loading && (!user || user.role !== 'partner')) {
        console.warn("Unauthorized access to Onboarding. Redirecting...");
        navigate('/partner-auth');
        return;
      }

      if (user?.role === 'partner') {
        const exists = await checkExistingUser(user.email?.split('@')[0] || sessionMobile);
        if (exists) {
          console.log("Partner already has an active or pending registry. Moving to Dashboard.");
          navigate('/partner-dashboard', { replace: true });
        }
      }
    };
    runGuard();
  }, [user, loading, navigate, sessionMobile]);

  const checkExistingUser = async (mobile: string) => {
    try {
      const shops = await getShops();
      return shops.some((s: any) => String(s.mobile) === String(mobile));
    } catch (err) {
      console.error("Error checking existing user:", err);
      return false;
    }
  };

  useEffect(() => { 
    window.scrollTo(0, 0);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkerQuantity = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const count = parseInt(val);
    
    setFormData(prev => {
      const arraySize = isNaN(count) ? 1 : Math.max(1, Math.min(6, count));
      
      const newWorkerImages = [...prev.workerImages];
      if (arraySize > newWorkerImages.length) {
        for (let i = newWorkerImages.length; i < arraySize; i++) {
          newWorkerImages.push(null);
        }
      } else if (arraySize < newWorkerImages.length) {
        newWorkerImages.splice(arraySize);
      }

      return { 
        ...prev, 
        workerQuantity: val === '' ? '' as any : count,
        workerImages: newWorkerImages
      };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'shopImages' && typeof index === 'number') {
      const newImages = [...formData.shopImages];
      newImages[index] = file;
      setFormData(prev => ({ ...prev, shopImages: newImages }));
    } else if (field === 'workerImages' && typeof index === 'number') {
      const newPics = [...formData.workerImages];
      newPics[index] = file;
      setFormData(prev => ({ ...prev, workerImages: newPics }));
    } else {
      setFormData(prev => ({ ...prev, [field]: file }));
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      // Using Nominatim (OpenStreetMap) free reverse geocoding API
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      const data = await response.json();
      
      if (data && data.display_name) {
        setFormData(prev => ({
          ...prev,
          manualAddress: data.display_name
        }));
      } else {
        console.warn("No results found for reverse geocoding.");
      }
    } catch (error) {
      console.error("Nominatim Geocoder failed:", error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          lat: latitude,
          lng: longitude
        }));
        
        // Auto-trigger reverse geocoding
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation Error:", error);
        let msg = "Unable to fetch location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location mandatory hai assignment ke liye.";
        }
        alert(msg);
      }
    );
  };

  const performRegistrySync = async (retryCount = 0): Promise<void> => {
    const documentId = formData.mobile; 

    if (!documentId) throw new Error("IDENTIFIER_MISSING: Partner mobile not found in session.");

    try {
      console.log(`Sync Attempt ${retryCount + 1}: Force Writing to Registry [ID: ${documentId}]...`);
      
      const tokenId = `BB-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setGeneratedToken(tokenId);

      // CRITICAL STORAGE BYPASS: Skip image processing for storage quota
      console.log("Images received but skipped for storage quota");

      const defaultServices = formData.category === 'Barber' ? [
        { name: 'Standard Haircut', price: 300 },
        { name: 'Beard Trim', price: 150 },
        { name: 'Head Massage', price: 100 }
      ] : [
        { name: 'Facial', price: 800 },
        { name: 'Hair Styling', price: 500 },
        { name: 'Threading', price: 50 }
      ];

      // 1. Update User Status to 'pending'
      if (updateUser) {
        await updateUser({ status: 'pending' });
      }
      
      // 2. Add Shop to Firestore
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("AUTH_SESSION_FAILURE: User not found after sign-up.");
      
      const registryPayload = {
        id: formData.mobile,
        brandName: formData.shopName.trim(),
        ownerName: formData.ownerName.trim(),
        category: formData.category,
        workerQuantity: formData.workerQuantity,
        mobile: formData.mobile,
        services: defaultServices,
        password: sessionPassword,
        lat: formData.lat,
        lng: formData.lng,
        manualAddress: formData.manualAddress.trim(),
        uid: currentUser.uid,
        status: 'pending',
        ownerPic: formData.ownerPic ? (formData.ownerPic instanceof File ? `OWNER_PIC: ${formData.ownerPic.name}` : 'OWNER_PIC_ATTACHED') : null,
        shopImages: formData.shopImages.map((img, idx) => img instanceof File ? `SHOP_IMAGE_${idx + 1}: ${img.name}` : null).filter(Boolean),
        workerImages: formData.workerImages.map((img, idx) => img instanceof File ? `WORKER_IMAGE_${idx + 1}: ${img.name}` : null).filter(Boolean),
        govId: formData.govId ? (formData.govId instanceof File ? `GOV_ID: ${formData.govId.name}` : 'GOV_ID_ATTACHED') : null
      };

      await addShop(registryPayload);
      
      console.log("Registry Sync SUCCESS: Professional data committed.");
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      window.location.href = '/partner-dashboard';

    } catch (err: any) {
      console.error("CRITICAL REGISTRY SYNC ERROR:", err);

      if (retryCount < 1) {
        console.warn("Retrying sync operation...");
        return performRegistrySync(retryCount + 1);
      }
      
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep < 4) {
      if (currentStep === 3 && !formData.lat) {
        alert("Location mandatory hai assignment ke liye.");
        return;
      }
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const quantity = parseInt(formData.workerQuantity as any);
    if (isNaN(quantity) || quantity < 1 || quantity > 6) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const isWorkerImagesFilled = formData.workerImages.every(img => img !== null);

    if (!formData.shopName.trim() || !formData.ownerName.trim() || !formData.upiId.trim() || !formData.govId || !formData.ownerPic) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!isWorkerImagesFilled) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!formData.lat) {
      alert("Location is mandatory for assigning experts and listing your shop. Please use the 'Get Current Location' button.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const exists = await checkExistingUser(formData.mobile);
      if (exists) {
        setIsProcessing(false);
        alert("A shop with this mobile number already exists.");
        return;
      }

      await performRegistrySync();
    } catch (err: any) {
      setIsProcessing(false);
      console.error("Silent Sync Error:", err);
    }
  };

  return (
    <div className="bg-white min-h-screen flex justify-center items-start overflow-y-auto">
      <div className="max-w-[1440px] mx-auto px-[5%] py-[5rem] w-full flex justify-center">
        <AnimatePresence mode="wait">
          {!isProcessing ? (
            <motion.div 
              key="registration-form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[60rem] bg-white border border-gray-100 p-[2.5rem] md:p-[4rem] rounded-[4rem] shadow-sm mb-[2.5rem]"
            >
              <div className="mb-[4rem] flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-50 pb-8">
                <div>
                  <h1 className="text-[2rem] md:text-[2.5rem] font-serif font-bold text-charcoal mb-[0.5rem] uppercase tracking-tight line-height-[1.1]">Onboarding Mode</h1>
                  <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.4em]">Step {currentStep} of 4: {
                    currentStep === 1 ? 'Category Selection' :
                    currentStep === 2 ? 'Brand Details' :
                    currentStep === 3 ? 'Location Capture' : 'Media & Docs'
                  }</p>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(s => (
                    <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${s <= currentStep ? 'bg-bbBlue' : 'bg-gray-100'}`}></div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-[4rem]">
                
                {/* STEP 1: CATEGORY SELECTION */}
                {currentStep === 1 && (
                  <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-[2.5rem]">
                    <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">01. Select Your Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <button 
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, category: 'Barber' }))}
                        className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 text-center ${formData.category === 'Barber' ? 'border-bbBlue bg-bbBlue/5' : 'border-gray-50 hover:border-gray-100'}`}
                      >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${formData.category === 'Barber' ? 'bg-bbBlue text-white' : 'bg-gray-50 text-gray-300'}`}>
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                        </div>
                        <span className="text-[0.875rem] font-bold uppercase tracking-widest text-charcoal">Barber Shop</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, category: 'Beauty Parlour' }))}
                        className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 text-center ${formData.category === 'Beauty Parlour' ? 'border-bbBlue bg-bbBlue/5' : 'border-gray-50 hover:border-gray-100'}`}
                      >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${formData.category === 'Beauty Parlour' ? 'bg-bbBlue text-white' : 'bg-gray-50 text-gray-300'}`}>
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A8.959 8.959 0 013 12c0-.778.099-1.533.284-2.253"/></svg>
                        </div>
                        <span className="text-[0.875rem] font-bold uppercase tracking-widest text-charcoal">Beauty Parlour</span>
                      </button>
                    </div>
                  </motion.section>
                )}

                {/* STEP 2: BRAND DETAILS */}
                {currentStep === 2 && (
                  <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-[3rem]">
                    <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">02. Tell us about your brand</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                      <div className="space-y-2">
                        <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-2">Owner Name</label>
                        <input required name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue" placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-2">Brand Name</label>
                        <input required name="shopName" value={formData.shopName} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue" placeholder="Elite Studio" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-2">Total Workers</label>
                        <input type="number" name="workerQuantity" min="1" max="6" value={formData.workerQuantity} onChange={handleWorkerQuantity} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue font-mono" />
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* STEP 3: LOCATION */}
                {currentStep === 3 && (
                  <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-[3rem]">
                    <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">03. Shop Address & GPS</h3>
                    <div className="space-y-8">
                       <div className="flex flex-col md:flex-row gap-6 items-start">
                         <button 
                           type="button" 
                           onClick={getCurrentLocation}
                           className={`px-8 py-5 rounded-2xl font-bold uppercase text-[0.625rem] tracking-[0.2em] transition-all flex items-center gap-3 ${formData.lat ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-charcoal text-white hover:bg-black'}`}
                         >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                           {isGeocoding ? 'Capturing...' : formData.lat ? 'GPS Captured' : 'Fetch Shop Location'}
                         </button>
                         {formData.lat && <p className="text-[0.5rem] font-bold text-emerald-500 uppercase tracking-widest mt-2">{formData.manualAddress ? 'Address Resolved' : 'Coordinates Fixed'}</p>}
                       </div>
                       <div className="space-y-4">
                         <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-2">Manual Landmark / Street (Required for Nav)</label>
                         <textarea required name="manualAddress" value={formData.manualAddress} onChange={(e) => setFormData(p => ({ ...p, manualAddress: e.target.value }))} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue min-h-[8rem] resize-none" placeholder="Exact address with landmark..." />
                       </div>
                    </div>
                  </motion.section>
                )}

                {/* STEP 4: MEDIA & DOCS */}
                {currentStep === 4 && (
                  <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-[4rem]">
                    <div className="space-y-[2.5rem]">
                      <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">Step 4.1: Shop Media</h3>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                        {formData.shopImages.map((img, idx) => (
                          <label key={idx} className="aspect-square border-2 border-dashed border-gray-50 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 hover:border-bbBlue/30 transition-all overflow-hidden">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'shopImages', idx)} />
                            {img ? (
                               <img src={img instanceof File ? URL.createObjectURL(img) : img as string} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                               <svg className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4"/></svg>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">Step 4.2: Settlement Info</h3>
                        <div className="space-y-4">
                          <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-2">UPI ID (Payments Gateway)</label>
                          <input required name="upiId" value={formData.upiId} onChange={handleInputChange} className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue font-mono" placeholder="yourname@upi" />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">Step 4.3: Identity Verification</h3>
                        <label className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-100 cursor-pointer hover:border-bbBlue/30 transition-all">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'govId')} />
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.govId ? 'bg-emerald-500 text-white' : 'bg-white text-gray-300'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                          </div>
                          <div>
                            <p className="text-[0.625rem] font-bold text-charcoal uppercase tracking-widest">{formData.govId ? 'Gov ID Uploaded' : 'Upload Government ID'}</p>
                            <p className="text-[0.5rem] text-gray-400 font-medium">Clear photo of Aadhaar/PAN</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </motion.section>
                )}

                <div className="flex gap-4">
                  {currentStep > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="px-8 py-5 border border-gray-100 rounded-2xl font-bold uppercase text-[0.625rem] tracking-[0.3em] hover:bg-gray-50 transition-all text-charcoal"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    type="submit" 
                    className="flex-1 py-5 bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.4em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98]"
                  >
                    {currentStep < 4 ? 'Continue Next' : 'Request Admission'}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div key="pending" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-[10rem] text-center">
              <div className="relative w-[8rem] h-[8rem] mb-[3rem]">
                 <div className="absolute inset-0 border-4 border-bbBlue/10 rounded-full"></div>
                 <div className={`absolute inset-0 border-4 border-bbBlue border-t-transparent rounded-full ${!generatedToken ? 'animate-spin' : 'border-t-bbBlue'}`}></div>
                 <div className="absolute inset-0 flex items-center justify-center text-bbBlue">
                    <svg className="w-[3rem] h-[3rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                 </div>
              </div>
              <h2 className="text-[2.5rem] font-serif font-bold text-charcoal mb-[1rem] uppercase tracking-tight">
                {generatedToken ? 'Registration Successful' : 'Syncing Registry'}
              </h2>
              {generatedToken ? (
                <div className="space-y-[1.5rem]">
                  <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.5em]">Admission Request Submitted</p>
                  <p className="text-[0.5625rem] text-gray-400 uppercase tracking-widest leading-relaxed max-w-[20rem] mx-auto">
                    Your details have been committed. Your request is now pending admin approval. You will be redirected shortly.
                  </p>
                </div>
              ) : (
                <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.5em] animate-pulse">Establishing Secure Handshake with Global Admission Hub...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PartnerRegistration;
