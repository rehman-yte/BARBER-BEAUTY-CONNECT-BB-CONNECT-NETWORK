
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Package, Truck, CheckCircle2, Clock, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

interface Order {
  id: string;
  customerName: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: any;
  items: any[];
  shippingAddress: any;
}

const MyShopping: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusStep = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'processing': return 1;
      case 'packed': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      default: return 1;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Date unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/30 pb-20">
      <div className="max-w-4xl mx-auto px-[5%]">
        <header className="mb-12 pt-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-bbBlue overflow-hidden rounded-2xl flex items-center justify-center shadow-lg shadow-bbBlue/20">
               <ShoppingBag className="text-white" size={24} />
            </div>
            <div>
               <h1 className="text-3xl font-serif font-bold text-charcoal tracking-tight">My Shopping</h1>
               <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mt-1">Track your premium essentials</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-bbBlue border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-[0.2em]">Synchronizing Registry...</p>
          </div>
        ) : orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-[2.5rem] p-12 text-center shadow-xl shadow-charcoal/5"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="text-gray-200" size={32} />
            </div>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-2">No Orders Yet</h2>
            <p className="text-[0.625rem] text-gray-400 uppercase tracking-widest mb-8">Your shopping history is currently empty</p>
            <button 
              onClick={() => window.location.href = '#/shop'}
              className="bg-bbBlue text-white px-8 py-3 rounded-full font-bold uppercase text-[0.625rem] tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-bbBlue/20"
            >
              Start Shopping
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, index) => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-xl shadow-charcoal/5"
              >
                {/* Header Section */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div className="space-y-1">
                      <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Order ID: {order.id.slice(0, 12)}...</p>
                      <p className="text-[0.625rem] font-bold text-charcoal uppercase tracking-widest">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold text-bbBlue">₹{order.totalAmount}</p>
                      <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">{order.paymentMethod?.toUpperCase()} PAYMENT</p>
                    </div>
                  </div>

                  {/* Tracking Bar */}
                  <div className="relative pt-12 pb-4">
                    <div className="absolute top-0 left-0 right-0 flex justify-between z-10">
                      {[
                        { label: 'Ordered', icon: Clock },
                        { label: 'Packed', icon: Package },
                        { label: 'Shipped', icon: Truck },
                        { label: 'Delivered', icon: CheckCircle2 }
                      ].map((step, idx) => {
                        const stepNum = idx + 1;
                        const currentStep = getStatusStep(order.status);
                        const isCompleted = currentStep > stepNum;
                        const isCurrent = currentStep === stepNum;
                        
                        return (
                          <div key={step.label} className="flex flex-col items-center gap-2 group">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                              isCompleted ? 'bg-bbBlue text-white' : 
                              isCurrent ? 'bg-charcoal text-white ring-4 ring-bbBlue/20' : 
                              'bg-gray-100 text-gray-300'
                            }`}>
                              <step.icon size={14} />
                            </div>
                            <span className={`text-[0.45rem] font-bold uppercase tracking-widest transition-colors ${
                              isCompleted || isCurrent ? 'text-charcoal' : 'text-gray-300'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Progress Background Line */}
                    <div className="absolute top-4 left-4 right-4 h-[2px] bg-gray-100">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(getStatusStep(order.status) - 1) * 33.33}%` }}
                        className="h-full bg-bbBlue"
                       />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${order.status === 'delivered' ? 'bg-green-500' : 'bg-bbBlue animate-pulse'}`}></span>
                       <p className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-widest">Currently: {order.status}</p>
                    </div>
                    <button className="text-gray-300 hover:text-bbBlue transition-colors">
                       {expandedOrder === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedOrder === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-50 bg-gray-50/30 overflow-hidden"
                    >
                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Items List */}
                          <div className="space-y-4">
                            <h4 className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Order Inventory</h4>
                            {order.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg overflow-hidden shrink-0">
                                   <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-grow">
                                   <p className="text-[0.625rem] font-bold text-charcoal truncate">{item.name}</p>
                                   <p className="text-[0.5rem] text-gray-400 uppercase font-mono">Qty: {item.quantity} × ₹{item.price}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Shipping Info */}
                          <div className="space-y-4">
                            <h4 className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Delivery Details</h4>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                               <div className="flex items-start gap-2 mb-2">
                                  <MapPin size={12} className="text-bbBlue mt-0.5" />
                                  <p className="text-[0.625rem] text-charcoal leading-relaxed font-medium">
                                    {order.shippingAddress?.address}
                                  </p>
                               </div>
                               <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest ml-5">
                                 {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
                               </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShopping;
