
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getShopById, addBooking } from '../services/logic_engine';

const ShopDetail: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart, clearCart } = useCart();
  const navigate = useNavigate();
  const [shopData, setShopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchShop = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getShopById(id);
        if (data) {
          // STRICT SECURITY: Only allow access if approved
          const isActuallyApproved = data.adminApproved === true || data.status === 'approved' || data.status === 'Active' || data.status === 'active';
          
          if (!isActuallyApproved) {
             console.warn("UNAUTHORIZED ACCESS: Shop is not approved for public booking.");
             navigate('/customer/explore');
             return;
          }
          setShopData(data);
          if (data.services && data.services.length > 0) {
            setSelectedService(data.services[0]);
          }
        } else {
          navigate('/customer/explore');
        }
      } catch (err) {
        console.error("Error fetching shop:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [id, navigate]);

  const getCustomerLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error("Error getting user location:", error)
      );
    }
  }, []);

  useEffect(() => {
    if (shopData && shopData.lat && shopData.lng) {
      getCustomerLocation();
    }
  }, [shopData, getCustomerLocation]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!shopData || !shopData.lat || !shopData.lng || !mapContainerRef.current) return;

    // Wait for Leaflet to be loaded from CDN
    const L = (window as any).L;
    if (!L) return;

    // Initialize Map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([shopData.lat, shopData.lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

      // Shop Marker
      L.marker([shopData.lat, shopData.lng]).addTo(mapRef.current)
        .bindPopup(shopData.brandName || 'Shop Location')
        .openPopup();
    }

    // Routing Logic
    if (userLocation && mapRef.current) {
      const routingControl = (window as any).L.Routing.control({
        waypoints: [
          L.latLng(userLocation.lat, userLocation.lng),
          L.latLng(shopData.lat, shopData.lng)
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false, // Hide the text directions panel
        lineOptions: {
          styles: [{ color: '#2358E1', opacity: 0.8, weight: 6 }]
        },
        createMarker: function(i: number, waypoint: any) {
          return L.marker(waypoint.latLng, {
            draggable: false,
            icon: L.icon({
              iconUrl: i === 0 
                ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'
                : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })
          });
        }
      }).addTo(mapRef.current);

      return () => {
        if (mapRef.current) {
          mapRef.current.removeControl(routingControl);
        }
      };
    }
  }, [shopData, userLocation]);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const generateSlots = () => {
    const slots = [];
    for (let h = 8; h <= 21; h++) {
      slots.push(`${h}:00`);
      slots.push(`${h}:30`);
    }
    slots.push(`22:00`);
    return slots;
  };
  const allSlots = generateSlots();

  const isSlotDisabled = (slot: string) => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (!isToday) return false;
    const [hour, min] = slot.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hour, min, 0, 0);
    return new Date() > slotTime;
  };

  const handleBooking = () => {
    if (!selectedSlot || !shopData || !selectedService) return;
    
    // Add booking details to cart and redirect to unified payment page
    clearCart();
    addToCart({
      id: `booking-${id}-${selectedSlot}-${selectedDate.getTime()}`,
      name: `${selectedService.name} (Booking)`,
      price: selectedService.price,
      image: shopData.shopImages?.[0] || shopData.brandImages?.[0] || '',
      category: 'Booking',
      shopId: id,
      shopName: shopData.brandName,
      date: selectedDate.toDateString(),
      time: selectedSlot,
      serviceName: selectedService.name,
      type: 'booking'
    });
    
    navigate('/checkout');
  };

  const handleAbandonment = async () => {
    if (!user || isProcessing || !shopData) {
      return;
    }

    const transactionId = `ABND-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const abandonPayload = {
      customerId: user.uid,
      customerName: user.name,
      partnerId: id,
      shopId: id,
      shopName: shopData.brandName || shopData.name,
      service: selectedService.name,
      serviceName: selectedService.name,
      price: selectedService.price,
      date: selectedDate.toDateString(),
      time: selectedSlot,
      status: 'Cancelled',
      message: 'Payment Cancel ❌, Slot Not Booked',
      statusReason: 'Payment Cancel ❌, Slot Not Booked',
      paymentStatus: 'abandoned',
      transactionId: transactionId,
    };

    try {
      await addBooking(abandonPayload);
    } catch (err) {
      console.error("Abandonment log failed:", err);
    }
    
    navigate('/customer-dashboard');
  };

  const handleUPILink = (app: string) => {
    if (!shopData) return;
    const merchantUpi = shopData.upiId || "bbconnect@upi";
    const amount = selectedService.price.toFixed(2);
    const txnNote = `BBCN ${selectedService.name} - ${shopData.brandName || shopData.name}`;
    const upiParams = `pa=${merchantUpi}&pn=${encodeURIComponent(shopData.brandName || shopData.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(txnNote)}`;
    
    let targetUrl = `upi://pay?${upiParams}`;

    if (app === 'GPay') {
      targetUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    } else if (app === 'PhonePe') {
      targetUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.phonepe.app;end`;
    } else if (app === 'Paytm') {
      targetUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=net.one97.paytm;end`;
    }
    
    window.location.href = targetUrl;
  };

  const handleConfirmPayment = async (method: string) => {
    if (!user || !shopData) return;
    setIsProcessing(true);

    const transactionId = `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const bookingPayload = {
      customerId: user.uid,
      customerName: user.name,
      partnerId: id, // UID of the partner
      shopId: id,
      shopName: shopData.brandName || shopData.name,
      service: selectedService.name,
      serviceName: selectedService.name,
      price: selectedService.price,
      date: selectedDate.toDateString(),
      time: selectedSlot,
      status: 'payment_held', 
      paymentStatus: 'success',
      paymentMethod: method,
      transactionId: transactionId,
      expiryTime: Date.now() + 5 * 60 * 1000, 
    };

    try {
      await addBooking(bookingPayload);
      setTimeout(() => {
        setIsProcessing(false);
        navigate('/customer-dashboard');
      }, 1500);
    } catch (err) {
      console.error("Storage Error:", err);
      setIsProcessing(false);
      alert("Connection failed. Registry update pending.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!shopData) return null;

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1440px] mx-auto px-[5%] py-[5rem] grid grid-cols-1 lg:grid-cols-2 gap-[4rem]">
        
        {/* LEFT: Info & Gallery */}
        <div className="space-y-[3rem]">
          <header>
            <h1 className="text-[3rem] font-serif font-bold text-bbBlue-deep mb-[1rem] leading-tight">{shopData.brandName}</h1>
            <div className="flex items-center gap-[1rem]">
               <div className="w-[2.5rem] h-[2.5rem] rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-charcoal overflow-hidden uppercase">
                 {((shopData.ownerPicture && shopData.ownerPicture !== 'pending_upload') || (shopData.photoURL && shopData.photoURL !== 'pending_upload')) ? (
                    <img src={shopData.ownerPicture || shopData.photoURL} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                 ) : (
                    shopData.ownerName?.[0] || 'M'
                 )}
               </div>
               <div>
                  <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest leading-tight">Master Professional</p>
                  <p className="text-[0.875rem] font-bold text-charcoal">{shopData.ownerName}</p>
               </div>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-[1rem]">
             {(shopData.shopImages || []).filter((url: string) => url !== 'pending_upload').map((url: string, i: number) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                   <img src={url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                </div>
             ))}
             {(!shopData.shopImages || shopData.shopImages.filter((u:string)=>u!=='pending_upload').length === 0) && (
               <div className="col-span-3 aspect-[21/9] bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center">
                 <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-widest">No Gallery Images Available</p>
               </div>
             )}
          </div>

          {/* Navigation Map Section */}
          <div className="space-y-[1.5rem]">
             <div className="flex justify-between items-center">
                <h3 className="text-[0.75rem] font-bold uppercase tracking-widest text-charcoal">Navigate to Partner</h3>
                {shopData.manualAddress && (
                  <p className="text-[0.625rem] text-gray-400 font-medium max-w-[15rem] text-right truncate">{shopData.manualAddress}</p>
                )}
             </div>
             <div className="relative">
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-[300px] bg-gray-50 rounded-[2rem] overflow-hidden shadow-inner border border-gray-100"
                />
                <div className="absolute bottom-4 right-4 flex gap-2 z-[1000]">
                   <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${shopData.lat},${shopData.lng}`, '_blank')}
                    className="px-4 py-2 bg-white text-charcoal rounded-xl text-[0.5rem] font-bold uppercase tracking-widest shadow-lg border border-gray-100 hover:bg-bbBlue hover:text-white transition-all"
                   >
                     Open in Google Maps
                   </button>
                </div>
             </div>
          </div>

          {/* Specialists Section */}
          <div className="space-y-[1.5rem]">
             <h3 className="text-[0.75rem] font-bold uppercase tracking-widest text-charcoal">Meet our Specialists</h3>
             <div className="grid grid-cols-3 sm:grid-cols-4 gap-[1rem]">
                {(shopData.workerImages || []).filter((url: string) => url !== 'pending_upload').map((url: string, i: number) => (
                   <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm group relative">
                      <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <span className="text-[0.5rem] text-white font-bold uppercase tracking-widest">Specialist {i+1}</span>
                      </div>
                   </div>
                ))}
                {(!shopData.workerImages || shopData.workerImages.filter((u:string)=>u!=='pending_upload').length === 0) && (
                  <div className="col-span-full py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-100 flex items-center justify-center">
                    <p className="text-[0.5rem] font-bold text-gray-300 uppercase tracking-widest">Specialist Roster Private</p>
                  </div>
                )}
             </div>
          </div>

          <div className="space-y-[1.5rem]">
             <h3 className="text-[0.75rem] font-bold uppercase tracking-widest text-charcoal">Registry Portfolio</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-[1rem]">
                {(shopData.services || []).map((s: any, i: number) => (
                   <button 
                      key={i}
                      onClick={() => setSelectedService(s)}
                      className={`flex justify-between items-center p-[1.5rem] rounded-3xl border transition-all ${
                        selectedService?.name === s.name ? 'border-bbBlue bg-bbBlue/5 shadow-inner' : 'border-gray-100 hover:border-bbBlue/30'
                      }`}
                   >
                      <span className="text-[0.875rem] font-bold text-charcoal uppercase tracking-tight">{s.name}</span>
                      <span className="text-[0.875rem] font-mono font-bold text-bbBlue">₹{s.price}</span>
                   </button>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT: Booking Engine */}
        <div className="space-y-[2.5rem]">
          <div className="p-[2rem] md:p-[3rem] border border-gray-100 rounded-[3rem] shadow-sm bg-gray-50/30">
             <h2 className="text-[1.5rem] font-serif font-bold text-bbBlue-deep mb-[2rem] text-center uppercase tracking-tight">Schedule Your Slot</h2>
             
             <div className="space-y-[1rem] mb-[2.5rem]">
                <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest text-center">Select Date</p>
                <div className="flex justify-between overflow-x-auto gap-[0.75rem] pb-[0.5rem] scrollbar-hide">
                   {dates.map((date, i) => {
                      const isActive = date.toDateString() === selectedDate.toDateString();
                      return (
                         <button 
                            key={i}
                            onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                            className={`flex-none w-[3.5rem] py-[1rem] rounded-2xl flex flex-col items-center gap-[0.25rem] transition-all ${
                               isActive ? 'bg-bbBlue text-white shadow-xl shadow-bbBlue/20' : 'bg-white border border-gray-100 text-charcoal hover:border-bbBlue/50'
                            }`}
                         >
                            <span className="text-[0.5rem] font-bold uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            <span className="text-[1.125rem] font-bold">{date.getDate()}</span>
                         </button>
                      );
                   })}
                </div>
             </div>

             <div className="space-y-[1.5rem]">
                <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest text-center">Select Time</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-[0.75rem]">
                   {allSlots.map((slot) => {
                      const disabled = isSlotDisabled(slot);
                      const isSelected = selectedSlot === slot;
                      return (
                         <button
                            key={slot}
                            disabled={disabled}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-[0.875rem] rounded-xl text-[0.625rem] font-bold tracking-widest transition-all ${
                               isSelected ? 'bg-bbBlue text-white shadow-lg' : 
                               disabled ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50' : 
                               'bg-white border border-gray-100 text-charcoal hover:border-bbBlue hover:text-bbBlue'
                            }`}
                         >
                            {slot}
                         </button>
                      );
                   })}
                </div>
             </div>

             <div className="mt-[3rem] pt-[2.5rem] border-t border-gray-100 flex flex-col items-center gap-[1.5rem]">
                <div className="text-center">
                   <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.25rem]">Total Fee (INR)</p>
                   <p className="text-[1.875rem] font-serif font-bold text-bbBlue-deep">₹{selectedService?.price || 0}.00</p>
                </div>
                {user?.role !== 'admin' ? (
                  <button 
                    onClick={handleBooking}
                    disabled={!selectedSlot}
                    className="w-full py-[1.25rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.3em] shadow-2xl shadow-bbBlue/30 hover:bg-blue-600 disabled:bg-gray-200 disabled:shadow-none transition-all"
                  >
                    Initiate Secure Payment
                  </button>
                ) : (
                  <div className="w-full py-[1.25rem] bg-gray-50 border border-gray-100 text-gray-400 rounded-2xl font-bold uppercase text-[0.625rem] tracking-widest text-center">
                    Admin View Only
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
         {/* Payment modal removed - now uses unified CheckoutPage */}
      </AnimatePresence>
    </div>
  );
};

export default ShopDetail;
