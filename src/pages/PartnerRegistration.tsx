import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { addShop } from '../services/logic_engine';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { Check, MapPin, Camera, User, BarChart, ShoppingBag } from 'lucide-react';

const PartnerRegistration: React.FC = () => {
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
      alert("Address is mandatory.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Prepare payload
      const shopPayload = {
        uid: user?.uid,
        ownerName: formData.ownerName,
        brandName: formData.brandName,
        address: formData.manualAddress,
        category: formData.category,
        workerQuantity: formData.workerCount,
        upiId: formData.upiId,
        lat: formData.lat,
        lng: formData.lng,
        status: 'pending',
        // indicators for validation
        shopImagesCount: formData.shopImages.filter(i => i !== null).length,
        workerImagesCount: formData.workerImages.filter(i => i !== null).length,
        hasOwnerPicture: !!formData.ownerPicture,
        hasGovId: !!formData.govId,
      };

      // 2. Save to partners collection
      await addShop({ 
        ...shopPayload, 
        id: user?.uid, // Using UID as document ID for easy lookup
        mobile: user?.email?.split('@')[0] // Fallback mobile from email if available
      });

      // 3. Update user status to pending in AuthContext/Users collection
      if (updateUser) {
        await updateUser({ status: 'pending' });
      }

      setIsSuccess(true);
      // 4. Redirect after 3s
      setTimeout(() => {
        navigate('/partner-dashboard');
      }, 3000);

    } catch (err: any) {
      setError(err.message || "Submission failed");
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-6">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/20"
        >
          <Check className="text-white w-12 h-12" />
        </motion.div>
        <h2 className="text-3xl font-serif font-bold text-charcoal mb-4 uppercase tracking-tight">Request Submitted</h2>
        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest max-w-sm">
          Your partner profile is now pending admin approval. Redirecting to your dashboard...
        </p>
        <div className="mt-12 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 3 }}
            className="h-full bg-bbBlue"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-[5rem] pb-[5rem]">
      <div className="max-w-[1440px] mx-auto px-[5%] flex justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[50rem] bg-white border border-gray-100 p-8 md:p-16 rounded-[4rem] shadow-sm"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16 border-b border-gray-50 pb-8">
            <div>
              <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.4em] mb-2">Partner Onboarding</p>
              <h1 className="text-3xl md:text-5xl font-serif font-bold text-charcoal uppercase tracking-tight leading-none">
                {currentStep === 1 ? 'Category' : currentStep === 2 ? 'Details' : currentStep === 3 ? 'Location' : 'Media'}
              </h1>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(step => (
                <div key={step} className={`w-12 h-1.5 rounded-full transition-all duration-500 ${step <= currentStep ? 'bg-bbBlue' : 'bg-gray-100'}`}></div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            
            {/* STEP 1: CATEGORY */}
            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">Select Business Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-bold uppercase tracking-widest text-[0.625rem]">
                  <button 
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, category: 'Barber' }))}
                    className={`p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-6 ${formData.category === 'Barber' ? 'border-bbBlue bg-bbBlue/5 text-bbBlue' : 'border-gray-50 text-gray-400 hover:border-gray-100'}`}
                  >
                    <BarChart className="w-10 h-10" />
                    Barber Shop
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, category: 'Beauty Parlour' }))}
                    className={`p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-6 ${formData.category === 'Beauty Parlour' ? 'border-bbBlue bg-bbBlue/5 text-bbBlue' : 'border-gray-50 text-gray-400 hover:border-gray-100'}`}
                  >
                    <ShoppingBag className="w-10 h-10" />
                    Beauty Parlour
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: BRAND DETAILS */}
            {currentStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">Brand & Team Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[0.625rem] font-bold uppercase tracking-widest">
                  <div className="space-y-3">
                    <label className="text-gray-400 ml-2">Owner Name</label>
                    <input required name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-bbBlue outline-none font-sans normal-case text-base" placeholder="Enter owner name" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-gray-400 ml-2">Brand Name</label>
                    <input required name="brandName" value={formData.brandName} onChange={handleInputChange} className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-bbBlue outline-none font-sans normal-case text-base" placeholder="Enter shop name" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-gray-400 ml-2">Worker Count</label>
                    <input required type="number" min="1" max="50" name="workerCount" value={formData.workerCount} onChange={handleInputChange} className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-bbBlue outline-none font-mono text-base" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: LOCATION */}
            {currentStep === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">GPS & Address Verification</h3>
                <div className="bg-gray-50 p-10 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center gap-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${formData.lat ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-white text-gray-300 shadow-sm'}`}>
                    <MapPin className={`w-10 h-10 ${isGeocoding ? 'animate-bounce' : ''}`} />
                  </div>
                  <div>
                    <h4 className="text-lg font-serif font-bold text-charcoal mb-2">{formData.lat ? 'Location Captured' : 'Ready to Capture'}</h4>
                    <p className="text-[0.625rem] text-gray-400 font-bold uppercase tracking-widest max-w-[15rem]">Your shop's location is required for network listing.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={fetchLocation}
                    disabled={isGeocoding}
                    className={`px-8 py-4 rounded-full font-bold uppercase text-[0.625rem] tracking-[0.3em] transition-all ${formData.lat ? 'bg-white text-emerald-500 border border-emerald-500' : 'bg-charcoal text-white hover:bg-black'}`}
                  >
                    {isGeocoding ? 'Capturing...' : formData.lat ? 'Capture Again' : 'Fetch Shop Location'}
                  </button>
                  {formData.lat && (
                    <p className="text-emerald-500 font-mono text-xs font-bold">
                      {formData.lat.toFixed(6)}, {formData.lng?.toFixed(6)}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">Manual Shop Address</label>
                  <textarea 
                    required 
                    name="manualAddress" 
                    value={formData.manualAddress} 
                    onChange={handleInputChange} 
                    rows={3}
                    className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-bbBlue outline-none font-sans text-base resize-none" 
                    placeholder="Enter full shop address (Floor, Building, Area, City)..." 
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 4: MEDIA */}
            {currentStep === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
                
                <div className="space-y-10">
                  <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">01. Media Uploads</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Owner Picture */}
                    <div className="space-y-4">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-widest ml-2">Owner Picture</label>
                      <label className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-bbBlue transition-all overflow-hidden relative">
                        <input required type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'ownerPicture')} />
                        {formData.ownerPicture ? (
                          <img src={formData.ownerPicture instanceof File ? URL.createObjectURL(formData.ownerPicture) : ''} className="w-full h-full object-cover" alt="Owner" />
                        ) : (
                          <User className="text-gray-300 w-10 h-10" />
                        )}
                      </label>
                    </div>

                    {/* Brand Images (5) */}
                    <div className="space-y-4">
                      <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-widest ml-2">Brand Images (5 Portfolio)</label>
                      <div className="grid grid-cols-5 gap-3">
                        {formData.shopImages.map((img, idx) => (
                          <label key={idx} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-bbBlue transition-all overflow-hidden relative">
                            <input required type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'shopImages', idx)} />
                            {img ? (
                              <img src={img instanceof File ? URL.createObjectURL(img) : ''} className="w-full h-full object-cover" alt="Brand" />
                            ) : (
                              <Camera className="text-gray-300 w-4 h-4" />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Worker Images (6) */}
                  <div className="space-y-6">
                    <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-widest ml-2">Worker Images (Up to 6 Experts)</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                      {formData.workerImages.map((img, idx) => (
                        <label key={idx} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-bbBlue transition-all overflow-hidden relative">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'workerImages', idx)} />
                          {img ? (
                            <img src={img instanceof File ? URL.createObjectURL(img) : ''} className="w-full h-full object-cover" alt="Worker" />
                          ) : (
                            <ShoppingBag className="text-gray-300 w-6 h-6" />
                          )}
                          {!img && <span className="absolute bottom-2 text-[0.4rem] font-bold text-gray-300 uppercase tracking-tighter">Slot {idx+1}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-[0.75rem] font-bold text-gray-400 uppercase tracking-[0.3em]">02. Verification Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[0.625rem] font-bold uppercase tracking-widest">
                    <div className="space-y-3">
                      <label className="text-gray-400 ml-2">UPI ID (Settlements)</label>
                      <input required name="upiId" value={formData.upiId} onChange={handleInputChange} className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-bbBlue outline-none font-mono text-base" placeholder="merchant@upi" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-gray-400 ml-2">Government ID</label>
                      <label className="flex items-center gap-4 p-5 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer hover:border-bbBlue transition-all">
                        <input required type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileChange(e, 'govId')} />
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.govId ? 'bg-emerald-500 text-white' : 'bg-white text-gray-300'} shadow-sm`}>
                          <Check className="w-6 h-6" />
                        </div>
                        <span className="text-[0.625rem] text-charcoal">{formData.govId ? (formData.govId instanceof File ? formData.govId.name.substring(0, 15) + '...' : 'ID Uploaded') : 'Upload Proof (Aadhar/PAN)'}</span>
                      </label>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {error && <p className="text-red-500 text-xs font-bold uppercase text-center">{error}</p>}

            {/* Controls */}
            <div className="flex gap-4 pt-10">
              {currentStep > 1 && (
                <button 
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="px-10 py-5 border border-gray-100 text-charcoal rounded-2xl font-bold uppercase text-[0.625rem] tracking-[0.3em] hover:bg-gray-50 transition-all active:scale-95"
                >
                  Back
                </button>
              )}
              <button 
                type="submit"
                disabled={isProcessing}
                className="flex-1 py-5 bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.4em] shadow-xl shadow-bbBlue/20 hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
              >
    {isProcessing ? 'Syncing Network...' : currentStep < 4 ? 'Continue Next' : 'Proceed'}
  </button>
</div>
</form>
</motion.div>
</div>
</div>
);
};

export default PartnerRegistration;
