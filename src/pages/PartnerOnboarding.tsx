import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { addShop } from '../services/logic_engine';
import { useAuth } from '../context/AuthContext';
import { Check, MapPin, Camera, User, ShoppingBag } from 'lucide-react';

const PartnerOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [formData, setFormData] = useState({
    ownerName: user?.name || '',
    brandName: '',
    mobileNumber: user?.email || '', // Set default if available
    manualAddress: '',
    category: 'Barber' as 'Barber' | 'Beauty Parlour',
    workerCount: 1,
    upiId: '',
    lat: null as number | null,
    lng: null as number | null,
    shopImages: Array(5).fill(null) as (File | string | null)[],
    workerImages: Array(6).fill(null) as (File | string | null)[],
    ownerPicture: null as File | string | null,
    govId: null as File | string | null,
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'partner')) {
      navigate('/partner-auth');
    }
  }, [user, loading, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'shopImages' && typeof index === 'number') {
      const newImages = [...formData.shopImages];
      newImages[index] = file;
      setFormData(prev => ({ ...prev, shopImages: newImages }));
    } else if (field === 'workerImages' && typeof index === 'number') {
      const newImages = [...formData.workerImages];
      newImages[index] = file;
      setFormData(prev => ({ ...prev, workerImages: newImages }));
    } else {
      setFormData(prev => ({ ...prev, [field]: file }));
    }
  };

  const fetchLocation = () => {
    setIsGeocoding(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setIsGeocoding(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }));
        setIsGeocoding(false);
      },
      (error) => {
        console.error("Location error:", error);
        alert("Location access denied. GPS coordinates are highly recommended, but you can use the manual address below.");
        setIsGeocoding(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
      return;
    }

    if (!formData.manualAddress) {
      setError("Physical address is mandatory for network registration.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Prepare payload (save ALL form fields as per Master Command)
      const shopPayload: any = {
        uid: user?.uid,
        ownerName: formData.ownerName,
        brandName: formData.brandName,
        mobileNumber: formData.mobileNumber,
        address: formData.manualAddress,
        category: formData.category,
        workerQuantity: formData.workerCount,
        upiId: formData.upiId,
        coords: { lat: formData.lat, lng: formData.lng },
        status: 'pending',
        onboardingComplete: true,
        // Media fields (storing as strings/placeholders for now)
        ownerPicture: typeof formData.ownerPicture === 'string' ? formData.ownerPicture : 'pending_upload',
        govId: typeof formData.govId === 'string' ? formData.govId : 'pending_upload',
        brandImages: formData.brandImages.map(img => typeof img === 'string' ? img : 'pending_upload'),
        workerImages: formData.workerImages.map(img => typeof img === 'string' ? img : 'pending_upload'),
        updatedAt: new Date().toISOString()
      };

      await addShop(shopPayload);

      // 2. Update local user status to trigger dashboard redirection
      if (updateUser) {
        await updateUser({ 
          status: 'pending',
          brandName: formData.brandName,
          onboardingComplete: true
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/partner-dashboard', { replace: true });
      }, 3000);

    } catch (err: any) {
      setError(err.message || "Submission failed. Please check your network connection.");
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center text-center p-6">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-bbBlue rounded-full flex items-center justify-center mb-8 shadow-xl shadow-bbBlue/20"
        >
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </motion.div>
        <h2 className="text-3xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Preparing your Dashboard...</h2>
        <p className="text-bbBlue text-[0.625rem] font-bold uppercase tracking-[0.5em] max-w-sm">
          Finalizing Partner Registry. 3 Seconds to Terminal Access.
        </p>
        <div className="mt-12 w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, ease: "linear" }}
            className="h-full bg-bbBlue shadow-[0_0_15px_rgba(42,125,225,0.5)]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* DEEP ONBOARDING HEADER */}
      <div className="bg-charcoal pt-[4rem] pb-[4rem] px-[5%] text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-bbBlue/5 skew-x-[-20deg] translate-x-20"></div>
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="max-w-[45rem] mx-auto relative z-10"
        >
          <h1 className="text-[2.5rem] md:text-[4rem] font-serif font-bold text-white mb-[1rem] uppercase tracking-tighter leading-none">
            Deep Onboarding Form
          </h1>
          <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.5em] mb-[3rem]">Proprietor Network Access Protocol</p>
          
          {/* STEP INDICATOR */}
          <div className="flex items-center justify-center gap-[1.5rem]">
             {[1, 2, 3, 4].map(step => (
               <div key={step} className="flex items-center">
                 <div className={`w-[2.5rem] h-[2.5rem] rounded-full border-2 flex items-center justify-center font-bold text-[0.75rem] transition-all duration-500 shadow-lg ${
                   currentStep >= step ? 'bg-bbBlue border-bbBlue text-white shadow-bbBlue/30' : 'border-white/10 text-white/30'
                 }`}>
                   {currentStep > step ? <Check size={16} /> : step}
                 </div>
                 {step < 4 && <div className={`w-[3rem] h-[1px] transition-all duration-1000 ${currentStep > step ? 'bg-bbBlue' : 'bg-white/10'}`}></div>}
               </div>
             ))}
          </div>
        </motion.div>
      </div>

      <div className="max-w-[1440px] mx-auto px-[5%] py-[5rem]">
        <div className="max-w-[50rem] mx-auto bg-white rounded-[4rem] p-[3rem] md:p-[5rem] border border-gray-100 shadow-2xl shadow-charcoal/5 relative mt-[-8rem]">
          
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-[3.5rem]"
                >
                  <div className="border-l-4 border-bbBlue pl-6">
                    <h2 className="text-[1.875rem] font-serif font-bold text-charcoal mb-[0.25rem] uppercase tracking-tight">Domain Selection</h2>
                    <p className="text-[0.625rem] text-gray-400 font-bold uppercase tracking-widest">Protocol 01: Identification of business category</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[1.5rem]">
                    {[
                      { id: 'Barber', label: 'BARBER STUDIO', icon: <ShoppingBag size={24} />, desc: 'Hair, Grooming & Shave Essentials' },
                      { id: 'Beauty Parlour', label: 'BEAUTY PARLOUR', icon: <Camera size={24} />, desc: 'Skin, Makeup & Holistic Beauty' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.id as any })}
                        className={`p-[3rem] rounded-[3rem] border-2 transition-all flex flex-col items-center text-center gap-[1.5rem] group relative overflow-hidden ${
                          formData.category === cat.id ? 'border-bbBlue bg-bbBlue/5' : 'border-gray-50 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <div className={`p-[1.5rem] rounded-2xl transition-all ${
                          formData.category === cat.id ? 'bg-bbBlue text-white shadow-xl shadow-bbBlue/20' : 'bg-gray-50 text-gray-300 group-hover:bg-gray-100'
                        }`}>
                          {cat.icon}
                        </div>
                        <div>
                          <span className={`block text-[0.875rem] font-bold uppercase tracking-[0.2em] mb-1 ${formData.category === cat.id ? 'text-bbBlue' : 'text-gray-400'}`}>
                            {cat.label}
                          </span>
                          <span className="text-[0.5625rem] font-medium text-gray-300 uppercase tracking-widest">{cat.desc}</span>
                        </div>
                        {formData.category === cat.id && (
                          <div className="absolute top-4 right-4 text-bbBlue">
                            <Check size={20} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      disabled={!formData.category}
                      className="w-full py-[1.5rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.4em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-30"
                    >
                      Authenticate Selection
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-[3.5rem]"
                >
                  <div className="border-l-4 border-bbBlue pl-6">
                    <h2 className="text-[1.875rem] font-serif font-bold text-charcoal mb-[0.25rem] uppercase tracking-tight">Brand Registry</h2>
                    <p className="text-[0.625rem] text-gray-400 font-bold uppercase tracking-widest">Protocol 02: Core identity and capacity load</p>
                  </div>

                  <div className="space-y-[2rem]">
                    <div className="flex flex-col gap-[0.5rem]">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Master Proprietor Name</label>
                      <input
                        required
                        type="text"
                        name="ownerName"
                        value={formData.ownerName}
                        onChange={handleInputChange}
                        placeholder="Legal name of the business owner"
                        className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-[0.5rem]">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Business Brand Designation</label>
                      <input
                        required
                        type="text"
                        name="brandName"
                        value={formData.brandName}
                        onChange={handleInputChange}
                        placeholder="Official shop name as visible to network"
                        className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-[0.5rem]">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Mobile Contact Registry</label>
                      <input
                        required
                        type="text"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleInputChange}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-[0.5rem]">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Operational Worker Load</label>
                      <div className="relative">
                        <select
                          name="workerCount"
                          value={formData.workerCount}
                          onChange={handleInputChange}
                          className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all appearance-none cursor-pointer font-bold"
                        >
                          {[1, 2, 3, 4, 5, 6].map(n => (
                            <option key={n} value={n}>{n} Master Specialist{n > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-[1.5rem] pt-6">
                    <button type="button" onClick={() => setCurrentStep(1)} className="flex-1 py-[1.5rem] border-2 border-gray-100 text-gray-400 rounded-2xl font-bold uppercase text-[0.625rem] tracking-[0.4em] hover:bg-gray-50 transition-all">Back</button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      disabled={!formData.ownerName || !formData.brandName}
                      className="flex-[2] py-[1.5rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.4em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-30"
                    >
                      Authenticate Identity
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-[3.5rem]"
                >
                  <div className="border-l-4 border-bbBlue pl-6">
                    <h2 className="text-[1.875rem] font-serif font-bold text-charcoal mb-[0.25rem] uppercase tracking-tight">GPS Synchronization</h2>
                    <p className="text-[0.625rem] text-gray-400 font-bold uppercase tracking-widest">Protocol 03: Mapping business coordinates</p>
                  </div>

                  <div className="p-[3.5rem] bg-bbBlue/5 border-2 border-dashed border-bbBlue/20 rounded-[3rem] text-center space-y-[2rem]">
                    <div className="w-[5rem] h-[5rem] bg-bbBlue text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-bbBlue/30 animate-pulse">
                      <MapPin size={28} />
                    </div>
                    <div className="max-w-[25rem] mx-auto">
                      <h3 className="text-[1.125rem] font-serif font-bold text-charcoal mb-[0.5rem] uppercase tracking-tight">Active Signal Lock</h3>
                      <p className="text-[0.6875rem] text-gray-500 font-medium leading-relaxed uppercase tracking-widest">The network requires your precise GPS signal for directory listing. Please allow browser location access.</p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchLocation}
                      disabled={isGeocoding}
                      className={`px-[3rem] py-[1.25rem] rounded-2xl font-bold text-[0.75rem] uppercase tracking-widest transition-all shadow-xl ${
                        formData.lat ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-charcoal text-white shadow-charcoal/20 hover:bg-black'
                      }`}
                    >
                      {isGeocoding ? 'Acquiring Signal...' : formData.lat ? 'Signal Re-Lock OK' : 'Capture Store Coordinates'}
                    </button>
                    {formData.lat && (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[0.5625rem] font-mono font-bold text-emerald-500 uppercase tracking-widest animate-pulse">Coordinates Synced</span>
                        <p className="text-[0.625rem] font-mono text-gray-400 font-bold">{formData.lat.toFixed(6)}, {formData.lng?.toFixed(6)}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-[0.5rem]">
                    <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Physical Registry Location (Floor, Block, Area)</label>
                    <textarea
                      required
                      name="manualAddress"
                      value={formData.manualAddress}
                      onChange={handleInputChange}
                      placeholder="Enter the full physical address for appointment navigation..."
                      rows={4}
                      className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all resize-none"
                    />
                  </div>

                  <div className="flex flex-col md:flex-row gap-[1.5rem] pt-6">
                    <button type="button" onClick={() => setCurrentStep(2)} className="flex-1 py-[1.5rem] border-2 border-gray-100 text-gray-400 rounded-2xl font-bold uppercase text-[0.625rem] tracking-[0.4em] hover:bg-gray-50 transition-all">Back</button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      disabled={!formData.lat || !formData.manualAddress}
                      className="flex-[2] py-[1.5rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.4em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-30"
                    >
                      Verify Coordinates
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-[3.5rem]"
                >
                  <div className="border-l-4 border-bbBlue pl-6">
                    <h2 className="text-[1.875rem] font-serif font-bold text-charcoal mb-[0.25rem] uppercase tracking-tight">Security & Media</h2>
                    <p className="text-[0.625rem] text-gray-400 font-bold uppercase tracking-widest">Protocol 04: Visual verification and settlement gateway</p>
                  </div>

                  <div className="space-y-[3rem]">
                    {/* Media Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[2.5rem]">
                      <div>
                        <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.4em] mb-4 block">Proprietor Master Portrait</label>
                        <label className="w-full h-[15rem] bg-gray-50 border-2 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-bbBlue transition-all overflow-hidden relative group bg-white">
                          <input required type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'ownerPicture')} />
                          {formData.ownerPicture ? (
                            <img src={formData.ownerPicture instanceof File ? URL.createObjectURL(formData.ownerPicture) : (typeof formData.ownerPicture === 'string' ? formData.ownerPicture : '')} className="w-full h-full object-cover" alt="Owner" />
                          ) : (
                            <div className="text-center group-hover:scale-110 transition-transform">
                              <User className="text-gray-200 w-12 h-12 mx-auto mb-2" />
                              <span className="text-[0.5rem] font-bold text-gray-300 uppercase tracking-widest">Upload Portrait</span>
                            </div>
                          )}
                        </label>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.4em] mb-4 block underline">Brand Showcase (5 Portfolio Photos)</label>
                        <div className="grid grid-cols-3 gap-[0.75rem]">
                          {formData.shopImages.map((img, idx) => (
                            <label key={idx} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-bbBlue transition-all overflow-hidden relative group bg-white">
                              <input required type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'shopImages', idx)} />
                              {img ? (
                                <img src={img instanceof File ? URL.createObjectURL(img) : (typeof img === 'string' ? img : '')} className="w-full h-full object-cover" alt="Portfolio" />
                              ) : (
                                <Camera className="text-gray-200 w-6 h-6 group-hover:rotate-12 transition-transform" />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Specialist Grid */}
                    <div className="space-y-4">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.4em] ml-2 block">Specialist Registry (Based on operational load: {formData.workerCount})</label>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-[1rem]">
                        {formData.workerImages.slice(0, formData.workerCount).map((img, idx) => (
                          <label key={idx} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-bbBlue transition-all overflow-hidden relative group bg-white">
                            <input required type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'workerImages', idx)} />
                            {img ? (
                              <img src={img instanceof File ? URL.createObjectURL(img) : (typeof img === 'string' ? img : '')} className="w-full h-full object-cover shadow-inner" alt="Specialist" />
                            ) : (
                              <User className="text-gray-200 w-8 h-8 group-hover:scale-110 transition-transform" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <span className="text-[0.45rem] text-white font-bold tracking-widest uppercase">Expert {idx+1}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Security & Finance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.4em] ml-2">Settlement Endpoint (UPI)</label>
                        <input required name="upiId" value={formData.upiId} onChange={handleInputChange} className="w-full px-8 py-5 bg-gray-100 border border-gray-100 rounded-2xl focus:border-bbBlue outline-none font-mono text-base font-bold" placeholder="yourname@upi" />
                        <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest px-2">Verification via global Accountant AI Engine Required.</p>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.4em] ml-2">Governance Validation (ID)</label>
                        <label className="flex items-center gap-4 p-5 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer hover:border-bbBlue transition-all group bg-white">
                          <input required type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileChange(e, 'govId')} />
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.govId ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-gray-100 text-gray-300 group-hover:bg-gray-200'} shrink-0`}>
                            {formData.govId ? <Check size={24} /> : <Camera size={24} />}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[0.6875rem] text-charcoal font-bold uppercase truncate">{formData.govId ? (formData.govId instanceof File ? formData.govId.name : 'Document Verified') : 'Upload Governance ID'}</span>
                            <span className="text-[0.5625rem] text-gray-400 font-medium uppercase tracking-widest">Aadhar / License / Business Pan</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-[1.5rem] pt-6">
                    <button type="button" onClick={() => setCurrentStep(3)} className="flex-1 py-[1.5rem] border-2 border-gray-100 text-gray-400 rounded-2xl font-bold uppercase text-[0.625rem] tracking-[0.4em] hover:bg-gray-50 transition-all">Back</button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-[2] py-[1.5rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.4em] shadow-2xl shadow-bbBlue/30 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-30"
                    >
                      {isProcessing ? 'Submitting...' : 'Initiate Network Access'}
                    </button>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl"
                    >
                      <p className="text-red-600 text-[0.625rem] font-bold uppercase truncate">{error}</p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
        
        {/* Verification Footnote */}
        <div className="text-center mt-[4rem] opacity-30 select-none pointer-events-none">
           <p className="text-[0.5rem] font-bold text-charcoal uppercase tracking-[0.5em]">System Architecture v4.8 — Verification Engine Active</p>
        </div>
      </div>
    </div>
  );
};

export default PartnerOnboarding;
