
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, ShieldCheck, CheckCircle2, ArrowLeft, Trash2, Plus, Minus, Wallet, Landmark, Smartphone, Check } from 'lucide-react';
import { getSettings } from '../services/logic_engine';

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CheckoutPage: React.FC = () => {
  const { cart, totalPrice, totalItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isSlotBooking = cart.some(item => 
    (item.category && String(item.category).toLowerCase().includes('service')) || 
    (item.name && String(item.name).includes('(Booking)'))
  );

  const [feePercent, setFeePercent] = useState<number>(10);
  
  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const settings = await getSettings();
        if (settings && typeof settings.platformFee === 'number' && active) {
          setFeePercent(settings.platformFee);
        }
      } catch (err) {
        console.error("Failed to load settings in CheckoutPage:", err);
      }
    };
    fetchSettings();
    return () => {
      active = false;
    };
  }, []);

  const feeAmount = Math.round((totalPrice * feePercent) / 100);
  const finalTotal = totalPrice + feeAmount;
  
  const [step, setStep] = useState<'cart' | 'shipping' | 'payment' | 'processing' | 'success'>('cart');
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'wallet' | 'netbanking' | 'card'>('upi');
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: '',
    wallet: '',
    bank: '',
    cardNum: '•••• •••• •••• 4242',
    expiry: '12 / 28',
    cvv: '•••'
  });
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    state: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePayment = async () => {
    setLoading(true);
    setPaymentError(null);

    // Step 1: Load Razorpay SDK Script
    const res = await loadRazorpayScript();
    if (!res) {
      setLoading(false);
      setPaymentError("Razorpay SDK failed to load. Are you offline?");
      return;
    }

    // Step 2: Call Backend Create Order API to obtain standard Order ID
    let razorpayOrderId = "";
    try {
      const createOrderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: finalTotal * 100, // in paise
          currency: "INR",
          type: isSlotBooking ? "slot_booking" : "product_purchase"
        })
      });

      const contentType = createOrderResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textError = await createOrderResponse.text();
        console.error("Non-JSON backend output received:", textError);
        throw new Error("Handshake failed. Server returned unexpected HTML content instead of order JSON.");
      }

      const createOrderData = await createOrderResponse.json();
      if (!createOrderData || !createOrderData.success) {
        throw new Error(createOrderData?.error || "Could not generate transaction order ID on the server.");
      }

      razorpayOrderId = createOrderData.order_id || createOrderData.orderId || "";
    } catch (orderErr: any) {
      console.error("Failed to generate order ID:", orderErr);
      setPaymentError(orderErr.message || "Failed to initiate secure payment checkout. Please try again.");
      setLoading(false);
      return;
    }

    // Step 3: Write initial pending transaction records to Firestore prior to standard handoff
    let finalOrderId = '';
    let finalBookingIds: string[] = [];

    try {
      // Write initial Order document
      const orderData = {
        customerId: user?.uid,
        customerName: formData.fullName || user?.name || 'Customer Booking',
        shippingAddress: isSlotBooking ? {
          address: 'N/A - Direct Service Slot Booking (Bypassed)',
          city: 'N/A',
          pincode: 'N/A',
          state: 'N/A'
        } : {
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          state: formData.state
        },
        items: cart,
        totalAmount: finalTotal, // Includes platform / service fee
        platformFee: feeAmount,
        status: 'payment_held', // initial pending status before signature validation
        paymentStatus: 'unpaid',
        paymentMethod: paymentMethod,
        razorpayOrderId: razorpayOrderId,
        transactionType: isSlotBooking ? 'SLOT_BOOKING' : 'SHOPPING',
        createdAt: serverTimestamp()
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      finalOrderId = orderRef.id;

      // Write initial Booking documents if slot booking
      if (isSlotBooking) {
        for (const item of cart) {
          if (
            (item.category && String(item.category).toLowerCase().includes('service')) || 
            (item.name && String(item.name).includes('(Booking)')) || 
            item.type === 'booking'
          ) {
            const bookingDocData = {
              customerId: user?.uid,
              customerName: formData.fullName || user?.name || 'Customer Booking',
              partnerId: item.shopId || item.partnerId || '',
              shopId: item.shopId || item.partnerId || '',
              shopName: item.shopName || 'Partner Salon',
              service: item.serviceName || item.name || 'Grooming Service',
              serviceName: item.serviceName || item.name || 'Grooming Service',
              price: item.price,
              date: item.date || new Date().toDateString(),
              time: item.time || '10:00',
              status: 'payment_held', // pending
              bookingStatus: 'pending_payment',
              paymentStatus: 'unpaid',
              paymentMethod: paymentMethod,
              razorpayOrderId: razorpayOrderId,
              createdAt: new Date().toISOString()
            };
            const bookingRef = await addDoc(collection(db, 'bookings'), bookingDocData);
            finalBookingIds.push(bookingRef.id);
          }
        }
      }
    } catch (saveError: any) {
      console.error("Database sync failed prior to checkout modal:", saveError);
      setPaymentError("Could not initialize order state database entry. Please try again.");
      setLoading(false);
      return;
    }

    // Step 4: Configure Razorpay Checkout options
    const options = {
      key: "rzp_test_SvrVkSoTGGlNX1", // Standard Razorpay credentials as requested
      amount: finalTotal * 100, // INR in paise
      currency: "INR",
      name: "Barber & Beauty Connect",
      order_id: razorpayOrderId, // Integrate backend order_id correctly
      description: isSlotBooking ? "Premium Slot Booking Payment" : "Premium Product Purchase Payment",
      image: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BB_CONNECT",
      handler: async function (response: any) {
        setStep('processing');
        setLoading(true);

        try {
          // Send signature validation to the backend service
          const verifyResponse = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              bookingDocIds: finalBookingIds,
              orderDocId: finalOrderId
            })
          });

          const verifyData = await verifyResponse.json();
          if (!verifyData || !verifyData.success) {
            throw new Error(verifyData?.error || "Transaction verification signature authentication failed.");
          }

          setStep('success');
          clearCart();
          
          // Successfully navigated
          setTimeout(() => {
            navigate('/customer/dashboard', { state: { successMessage: "Payment successful! Your order has been confirmed." } });
          }, 2000);
          
        } catch (error: any) {
          console.error("Critical: Payment verified but order sync failed:", error);
          setPaymentError(error.message || "Payment Successful, but we encountered a signature verification sync error.");
          setStep('payment');
        } finally {
          setLoading(false);
        }
      },
      prefill: {
        name: formData.fullName || user?.name || "Customer",
        email: formData.email || user?.email || "customer@example.com",
        contact: formData.phone || ""
      },
      notes: {
        address: formData.address || 'N/A - Direct Booking'
      },
      theme: {
        color: "#2358E1" // bbBlue
      }
    };

    // Build configuration sequence according to user choice
    if (paymentMethod === 'upi') {
      (options as any).config = {
        display: {
          blocks: {
            upi: {
              name: 'Unified Payments Interface',
              instruments: [
                {
                  method: 'upi',
                  flows: ['intent', 'qr', 'collect']
                }
              ]
            }
          },
          sequence: ['block.upi', 'card', 'netbanking'],
          preferences: {
            show_default_blocks: true
          }
        }
      };
    } else if (paymentMethod === 'card') {
      (options as any).config = {
        display: {
          blocks: {
            cards: {
              name: 'Credit and Debit Cards',
              instruments: [
                {
                  method: 'card'
                }
              ]
            }
          },
          sequence: ['block.cards', 'upi', 'netbanking'],
          preferences: {
            show_default_blocks: true
          }
        }
      };
    } else {
      (options as any).config = {
        display: {
          sequence: ['upi', 'card', 'netbanking'],
          preferences: {
            show_default_blocks: true
          }
        }
      };
    }

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setPaymentError(resp.error.description || "Transaction failed. Please try again.");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Failed to initialize Razorpay:", err);
      setPaymentError("Could not initialize payment gateway popup. Please try again.");
      setLoading(false);
    }
  };

  if (cart.length === 0 && step !== 'success') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Truck className="text-gray-200" size={40} />
        </div>
        <h2 className="text-3xl font-serif font-bold text-charcoal mb-4">Your cart is empty</h2>
        <p className="text-gray-400 uppercase tracking-widest text-[0.625rem] mb-8">Start adding premium essentials to your inventory</p>
        <button 
          onClick={() => navigate('/shop')}
          className="bg-bbBlue text-white px-10 py-4 rounded-full font-bold uppercase text-[0.75rem] tracking-widest shadow-xl shadow-bbBlue/20 hover:bg-blue-600 transition-all"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-6xl mx-auto px-[5%]">
        {/* UNDER WEBSITE NAME DYNAMIC FLOW LABEL */}
        <div className="pt-8 pb-4 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="space-y-1">
            <span className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.4em] block">
              BARBER & BEAUTY CONNECT
            </span>
            <h1 className="text-2xl font-serif font-black text-charcoal tracking-wide uppercase">
              {isSlotBooking ? "SLOT" : "CART"}
            </h1>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] bg-gray-50 py-1.5 px-3.5 rounded-full border border-gray-100">
              {isSlotBooking ? "Context: Service Slot Reservation" : "Context: Product Logistics Checkout"}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12 py-8 border-b border-gray-100">
          {(isSlotBooking 
            ? [
                { id: 'cart', label: 'Slot', icon: ShieldCheck },
                { id: 'payment', label: 'Payment', icon: CreditCard }
              ]
            : [
                { id: 'cart', label: 'Cart', icon: ShieldCheck },
                { id: 'shipping', label: 'Shipping', icon: Truck },
                { id: 'payment', label: 'Payment', icon: CreditCard }
              ]
          ).map((s, idx, stepsArr) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = isActive ? false : (
              (step === 'shipping' && s.id === 'cart') ||
              (step === 'payment' && (s.id === 'cart' || s.id === 'shipping')) ||
              (step === 'success' && (s.id === 'cart' || s.id === 'shipping' || s.id === 'payment'))
            );
            
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-bbBlue text-white shadow-lg shadow-bbBlue/20' : 
                    isDone ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-300'
                  }`}>
                    {isDone ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                  </div>
                  <span className={`text-[0.5rem] font-bold uppercase tracking-widest ${isActive ? 'text-bbBlue' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < stepsArr.length - 1 && <div className="flex-grow h-[1px] bg-gray-100 mx-4 mb-6" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {step === 'cart' && (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h3 className="text-2xl font-serif font-bold text-charcoal mb-8">Review Your Selection</h3>
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow">
                        <p className="text-[0.5rem] font-bold text-bbBlue uppercase tracking-widest mb-1">{item.category}</p>
                        <h4 className="text-lg font-serif font-bold text-charcoal mb-2">{item.name}</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center bg-white rounded-full border border-gray-200 px-2">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 text-gray-400 hover:text-bbBlue"><Minus size={14} /></button>
                            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 text-gray-400 hover:text-bbBlue"><Plus size={14} /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-bold text-charcoal">₹{item.price * item.quantity}</p>
                        <p className="text-[0.625rem] text-gray-400">₹{item.price} each</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-8 flex justify-between">
                    <button onClick={() => navigate('/shop')} className="flex items-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors">
                      <ArrowLeft size={14} /> {isSlotBooking ? 'CONTINUE SLOT BOOKING' : 'Continue Shopping'}
                    </button>
                    <button 
                      onClick={() => setStep(isSlotBooking ? 'payment' : 'shipping')}
                      className="bg-charcoal text-white px-10 py-4 rounded-full font-bold uppercase text-[0.75rem] tracking-widest hover:bg-bbBlue transition-all shadow-xl"
                    >
                      {isSlotBooking ? "Confirm Booking & Pay" : "Proceed to Shipping"}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'shipping' && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <h3 className="text-2xl font-serif font-bold text-charcoal mb-8">Shipping Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">Full Name</label>
                      <input name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
                      <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue transition-all font-mono" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">Delivery Address</label>
                      <textarea name="address" value={formData.address} onChange={handleInputChange} rows={3} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue transition-all resize-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">City</label>
                      <input name="city" value={formData.city} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">Pincode</label>
                      <input name="pincode" value={formData.pincode} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue transition-all font-mono" />
                    </div>
                  </div>
                  <div className="pt-8 flex justify-between">
                    <button onClick={() => setStep('cart')} className="flex items-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors">
                      <ArrowLeft size={14} /> Back to Cart
                    </button>
                    <button 
                      onClick={() => setStep('payment')}
                      disabled={!formData.address || !formData.phone}
                      className="bg-charcoal text-white px-10 py-4 rounded-full font-bold uppercase text-[0.75rem] tracking-widest hover:bg-bbBlue transition-all shadow-xl disabled:opacity-50"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-serif font-bold text-charcoal">Secure Payment</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
                      <ShieldCheck size={12} className="text-green-500" />
                      <span className="text-[0.5rem] font-bold text-green-600 uppercase tracking-widest">256-bit AES Encryption</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* UPI Option */}
                    <button 
                      onClick={() => setPaymentMethod('upi')}
                      className={`flex items-center justify-between p-6 rounded-[1.5rem] border transition-all ${paymentMethod === 'upi' ? 'border-bbBlue bg-bbBlue/5 shadow-sm' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'upi' ? 'bg-bbBlue text-white' : 'bg-white text-gray-400'}`}>
                          <Smartphone size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-charcoal">UPI Payment</p>
                          <p className="text-[0.5625rem] text-gray-400 uppercase tracking-widest mt-0.5">Google Pay, PhonePe</p>
                        </div>
                      </div>
                      {paymentMethod === 'upi' && <Check size={16} className="text-bbBlue" />}
                    </button>

                    {/* Card Option */}
                    <button 
                      onClick={() => setPaymentMethod('card')}
                      className={`flex items-center justify-between p-6 rounded-[1.5rem] border transition-all ${paymentMethod === 'card' ? 'border-bbBlue bg-bbBlue/5 shadow-sm' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'card' ? 'bg-bbBlue text-white' : 'bg-white text-gray-400'}`}>
                          <CreditCard size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-charcoal">Credit / Debit Card</p>
                          <p className="text-[0.5625rem] text-gray-400 uppercase tracking-widest mt-0.5">Visa, Mastercard, RuPay</p>
                        </div>
                      </div>
                      {paymentMethod === 'card' && <Check size={16} className="text-bbBlue" />}
                    </button>

                    {/* Net Banking */}
                    <button 
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`flex items-center justify-between p-6 rounded-[1.5rem] border transition-all ${paymentMethod === 'netbanking' ? 'border-bbBlue bg-bbBlue/5 shadow-sm' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'netbanking' ? 'bg-bbBlue text-white' : 'bg-white text-gray-400'}`}>
                          <Landmark size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-charcoal">Net Banking</p>
                          <p className="text-[0.5625rem] text-gray-400 uppercase tracking-widest mt-0.5">Major Indian Banks</p>
                        </div>
                      </div>
                      {paymentMethod === 'netbanking' && <Check size={16} className="text-bbBlue" />}
                    </button>

                    {/* Wallets */}
                    <button 
                      onClick={() => setPaymentMethod('wallet')}
                      className={`flex items-center justify-between p-6 rounded-[1.5rem] border transition-all ${paymentMethod === 'wallet' ? 'border-bbBlue bg-bbBlue/5 shadow-sm' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'wallet' ? 'bg-bbBlue text-white' : 'bg-white text-gray-400'}`}>
                          <Wallet size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-charcoal">Wallets</p>
                          <p className="text-[0.5625rem] text-gray-400 uppercase tracking-widest mt-0.5">Paytm, Amazon Pay</p>
                        </div>
                      </div>
                      {paymentMethod === 'wallet' && <Check size={16} className="text-bbBlue" />}
                    </button>
                  </div>
                  <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <ShieldCheck className="text-bbBlue" size={32} />
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <p className="text-[10px] font-bold text-charcoal uppercase tracking-widest">Razorpay Standard Handoff</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest leading-relaxed">
                        {paymentMethod === 'upi' && "UPI Intent is active. Pay directly via PhonePe, Google Pay, Paytm, or BHIM apps."}
                        {paymentMethod === 'card' && "Cards module is active. Pay securely with major credit/debit cards."}
                        {paymentMethod === 'netbanking' && "Net Banking is active. Pay directly from top Indian bank login gateways."}
                        {paymentMethod === 'wallet' && "Digital Wallets active. Pay via Paytm, Amazon Pay, or PhonePe wallet."}
                      </p>
                    </div>
                    <div className="text-[8px] text-gray-400 font-medium uppercase tracking-widest bg-white py-2 px-4 rounded-full border border-gray-100">
                      Standard SDK Sandbox Gateway Mode Enabled
                    </div>
                  </div>

                  {paymentError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-6"
                    >
                      <p className="text-[0.625rem] font-bold text-red-500 uppercase tracking-widest text-center">{paymentError}</p>
                    </motion.div>
                  )}

                  <div className="pt-8 flex flex-col md:flex-row justify-between gap-4">
                    <button 
                      onClick={() => setStep(isSlotBooking ? 'cart' : 'shipping')} 
                      className="flex items-center justify-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors order-2 md:order-1"
                    >
                      <ArrowLeft size={14} /> {isSlotBooking ? "CONTINUE SLOT BOOKING" : "Back to Cart"}
                    </button>
                    <button 
                      onClick={handlePayment}
                      disabled={loading}
                      className="bg-bbBlue text-white px-10 py-5 rounded-3xl font-bold uppercase text-[0.75rem] tracking-[0.2em] shadow-2xl shadow-bbBlue/30 hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 order-1 md:order-2"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck size={20} />
                          <span>Finalize & Pay ₹{finalTotal}</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-20 flex flex-col items-center justify-center text-center space-y-8"
                >
                  <div className="relative">
                    <div className="w-32 h-32 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShieldCheck size={40} className="text-bbBlue opacity-20" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif font-bold text-charcoal mb-4">Verifying Transaction</h3>
                    <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.3em] leading-relaxed max-w-xs mx-auto">
                      Connecting to Secure Gateway Hub. <br/> Do not refresh or close this tab.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[0.5rem] font-bold text-emerald-600 uppercase tracking-widest">Secure Connection Active</span>
                    </div>
                    <div className="w-[1px] h-4 bg-gray-200"></div>
                    <span className="text-[0.75rem] font-mono font-bold text-charcoal">₹{finalTotal}</span>
                  </div>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-20 text-center"
                >
                  <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-500/10">
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-4xl font-serif font-bold text-charcoal mb-4">Order Confirmed!</h2>
                  <p className="text-gray-400 uppercase tracking-widest text-[0.625rem] mb-12 max-w-md mx-auto leading-relaxed">
                    {isSlotBooking 
                      ? "Your slot booking has been successfully confirmed. Please check your dashboard for details." 
                      : "Your premium essentials are being prepared for dispatch. You will receive a tracking link via SMS shortly."}
                  </p>
                  <button 
                    onClick={() => navigate('/customer-dashboard')}
                    className="bg-charcoal text-white px-10 py-4 rounded-full font-bold uppercase text-[0.75rem] tracking-widest hover:bg-bbBlue transition-all shadow-xl"
                  >
                    View My Orders
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Summary */}
          {step !== 'success' && (
            <div className="lg:col-span-4">
              <div className="bg-gray-50 rounded-[2.5rem] p-8 sticky top-24">
                <h4 className="text-[0.625rem] font-bold text-charcoal uppercase tracking-[0.4em] mb-8 pb-4 border-b border-gray-200">Order Summary</h4>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal ({totalItems} items)</span>
                    <span className="font-mono font-bold">₹{totalPrice}</span>
                  </div>
                  {!isSlotBooking && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Shipping</span>
                      <span className="text-green-500 font-bold uppercase text-[10px]">Free</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">{isSlotBooking ? 'Service Fee' : 'Platform Fee'} ({feePercent}%)</span>
                    <span className="font-mono font-bold">₹{feeAmount}</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-200 flex justify-between items-end mb-8">
                  <span className="text-[0.625rem] font-bold text-charcoal uppercase tracking-widest">Total Amount</span>
                  <span className="text-3xl font-mono font-bold text-bbBlue">₹{finalTotal}</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">
                    <ShieldCheck size={14} className="text-bbBlue" /> 256-bit SSL Encryption
                  </div>
                  <div className="flex items-center gap-3 text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">
                    {isSlotBooking ? (
                      <>
                        <ShieldCheck size={14} className="text-bbBlue" /> SECURE APPOINTMENT CONFIRMATION
                      </>
                    ) : (
                      <>
                        <Truck size={14} className="text-bbBlue" /> Priority Network Delivery
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
