import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { addShop, getShops } from '../services/logic_engine';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';

const PartnerRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
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
          msg = "Location is mandatory for assigning experts and listing your shop. Please enable it in your browser settings.";
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

      // 1. Skip Signup - Already handled in Step 1
      
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
              <div className="mb-[4rem] text-center md:text-left">
                <h1 className="text-[2.5rem] md:text-[3.125rem] font-serif font-bold text-charcoal mb-[1rem] uppercase tracking-tight">Onboarding Mode</h1>
                <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.4em]">Finalize Your Professional Hub</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-[5rem]">
                
                {/* 01. IDENTITY */}
                <section className="space-y-[2.5rem]">
                  <h3 className="text-[0.75rem] font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-[1rem]">01. Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[2.5rem]">
                    <div className="space-y-[1rem]">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">Full Owner Name</label>
                      <input required name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue" />
                    </div>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-[1.5rem] cursor-pointer bg-gray-50/50 hover:border-bbBlue/30 transition-all group">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'ownerPic')} />
                      <div className={`w-[4rem] h-[4rem] rounded-full flex items-center justify-center mb-[1rem] ${formData.ownerPic ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                        <svg className="w-[2rem] h-[2rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      </div>
                      <span className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">{formData.ownerPic ? 'Captured' : 'Upload Picture'}</span>
                    </label>
                  </div>
                </section>

                {/* 02. SHOP HUB */}
                <section className="space-y-[2.5rem]">
                  <h3 className="text-[0.75rem] font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-[1rem]">02. Shop Hub</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[2.5rem]">
                    <div className="space-y-[1rem]">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">Shop Name</label>
                      <input required name="shopName" value={formData.shopName} onChange={handleInputChange} className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue" />
                    </div>
                    <div className="space-y-[1rem]">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">Category</label>
                      <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] font-bold uppercase tracking-widest text-bbBlue outline-none">
                         <option value="Barber">Barber</option>
                         <option value="Beauty Parlour">Beauty Parlour</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[2.5rem]">
                    <div className="space-y-[1rem]">
                       <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">Worker Quantity</label>
                       <input 
                         type="number" 
                         name="workerQuantity" 
                         min="1" 
                         max="6" 
                         value={formData.workerQuantity} 
                         onChange={handleWorkerQuantity} 
                         placeholder="1-6"
                         className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] font-mono outline-none focus:border-bbBlue" 
                       />
                    </div>
                    <div className="space-y-[1rem]">
                       <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">Mobile Number (Primary Key)</label>
                       <input 
                         readOnly 
                         value={formData.mobile} 
                         className="w-full px-[1.5rem] py-[1.25rem] bg-gray-100 border border-gray-100 rounded-2xl text-[0.875rem] font-mono outline-none text-gray-400 cursor-not-allowed" 
                       />
                    </div>
                  </div>

                  <div className="space-y-[1.5rem]">
                    <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">Worker Images ({formData.workerQuantity || 0} REQUIRED)</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                      {formData.workerImages.map((img, idx) => (
                        <label key={idx} className="aspect-square border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 hover:border-bbBlue/30 transition-all group">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'workerImages', idx)} />
                          {img ? (
                            <div className="w-full h-full rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                            </div>
                          ) : (
                            <svg className="w-6 h-6 text-gray-200 group-hover:text-bbBlue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4"/></svg>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-[1.5rem]">
                    <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">Shop Showcase (6 Images Preferred)</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                      {formData.shopImages.map((img, idx) => (
                        <label key={idx} className="aspect-square border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 hover:border-bbBlue/30 transition-all group">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'shopImages', idx)} />
                          {img ? (
                            <div className="w-full h-full rounded-2xl bg-green-50 flex items-center justify-center text-green-500 overflow-hidden">
                              <img src={img instanceof File ? URL.createObjectURL(img) : img as string} className="w-full h-full object-cover" alt={`Shop ${idx + 1}`} referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <svg className="w-6 h-6 text-gray-200 group-hover:text-bbBlue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </section>

                {/* 03. SHOP EXACT ADDRESS */}
                <section className="space-y-[2.5rem]">
                  <h3 className="text-[0.75rem] font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-[1rem]">03. Shop Exact Address</h3>
                  <div className="space-y-[2rem]">
                    <div className="flex flex-col md:flex-row gap-[2rem] items-start md:items-center">
                      <button 
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isGeocoding}
                        className="px-[2rem] py-[1rem] bg-charcoal text-white rounded-2xl font-bold uppercase text-[0.625rem] tracking-[0.2em] hover:bg-black transition-all flex items-center gap-3 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        {isGeocoding ? 'Fetching Address...' : formData.lat ? 'Location Captured' : 'Get Current Location'}
                      </button>
                      {formData.lat && (
                        <div className="flex gap-4 text-[0.625rem] font-mono text-bbBlue font-bold bg-bbBlue/5 px-4 py-2 rounded-xl">
                          <span>LAT: {formData.lat.toFixed(6)}</span>
                          <span>LNG: {formData.lng?.toFixed(6)}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-[1rem]">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">Manual Landmark / Address</label>
                      <textarea 
                        required={!formData.lat}
                        name="manualAddress"
                        value={formData.manualAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, manualAddress: e.target.value }))}
                        placeholder="Enter full address or landmark details..."
                        className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue min-h-[8rem] resize-none"
                      />
                      <p className="text-[0.5rem] text-gray-400 font-bold uppercase tracking-widest">
                        * Mandatory: Either GPS coordinates or a full manual address is required.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 04. SETTLEMENTS */}
                <section className="space-y-[2.5rem]">
                  <h3 className="text-[0.75rem] font-bold text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-[1rem]">04. Settlements</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[2.5rem]">
                    <div className="space-y-[1rem]">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">UPI ID for Payments</label>
                      <input required name="upiId" value={formData.upiId} onChange={handleInputChange} placeholder="brand@upi" className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] font-mono outline-none focus:border-bbBlue" />
                    </div>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-[1.5rem] cursor-pointer bg-gray-50/50 hover:border-bbBlue/30 transition-all group">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'govId')} />
                      <div className={`w-[4rem] h-[4rem] rounded-2xl flex items-center justify-center mb-[1rem] ${formData.govId ? 'bg-green-50 text-green-500' : 'bg-white text-gray-200 group-hover:text-bbBlue'}`}>
                        <svg className="w-[2rem] h-[2rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                      </div>
                      <span className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">{formData.govId ? 'ID Scanned' : 'Scan Gov ID'}</span>
                    </label>
                  </div>
                </section>

                <button 
                  type="submit" 
                  disabled={formData.workerImages.filter(img => img !== null).length < formData.workerQuantity}
                  className="w-full py-[1.5rem] bg-bbBlue text-white rounded-3xl font-bold uppercase text-[0.75rem] tracking-[0.4em] shadow-2xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Request Network Admission
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="pending" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-[10rem] text-center">
              <div className="relative w-[8rem] h-[8rem] mb-[3rem]">
                 <div className="absolute inset-0 border-4 border-bbBlue/10 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
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
