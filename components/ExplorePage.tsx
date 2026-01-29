
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { db } from '../firebase/firebaseConfig';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const ExplorePage: React.FC = () => {
  const [filter, setFilter] = useState<'All' | 'Barber' | 'Beauty Parlour'>('All');
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    // Fetching from the unified Professional Registry 'partners_registry'
    // Using a broad query to allow client-side filtering for isVerified and status
    const q = query(collection(db, 'partners_registry'), orderBy('onboardedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // STRICT FILTER: Only shops with (isVerified === true) AND (status === 'approved') are visible to customers
      const approvedShops = docs.filter(shop => shop.isVerified === true && shop.status === 'approved');
      
      setShops(approvedShops);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Fetch Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredShops = filter === 'All' 
    ? shops 
    : shops.filter(shop => shop.category === filter);

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-bbBlue-deep mb-4 uppercase tracking-tight">Discover Excellence</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Verified Network Professionals Only</p>
        </header>

        {/* Category Tabs */}
        <div className="flex gap-4 mb-12 border-b border-gray-100 pb-4 overflow-x-auto scrollbar-hide">
          {['All', 'Barber', 'Beauty Parlour'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type as any)}
              className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all whitespace-nowrap ${
                filter === type ? 'bg-bbBlue text-white shadow-lg shadow-bbBlue/20' : 'text-gray-400 hover:text-bbBlue'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="col-span-full py-40 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-bbBlue border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Scanning Registry...</p>
              </div>
            ) : filteredShops.length > 0 ? (
              filteredShops.map((shop) => (
                <motion.div 
                  layout
                  key={shop.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden group shadow-sm hover:shadow-2xl transition-all duration-700"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img 
                      src={shop.shopImages?.[0] || "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600"} 
                      alt={shop.brandName} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" 
                    />
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full flex items-center gap-1.5 shadow-sm">
                      <span className="text-[10px] font-bold text-bbBlue-deep">Verified</span>
                      <svg className="w-3.5 h-3.5 text-bbBlue" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </div>
                  </div>
                  <div className="p-8">
                    <p className="text-[9px] font-bold text-bbBlue uppercase tracking-widest mb-1">{shop.category}</p>
                    <h3 className="text-xl font-serif font-bold text-charcoal mb-4 group-hover:text-bbBlue transition-colors">{shop.brandName}</h3>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-bold text-charcoal uppercase overflow-hidden">
                          {shop.ownerName?.[0] || 'M'}
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{shop.ownerName}</span>
                      </div>
                      <Link 
                        to={`/shop/${shop.id}`}
                        className="bg-charcoal text-white px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-bbBlue transition-all active:scale-95"
                      >
                        Book Slot
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-40 text-center border-2 border-dashed border-gray-100 rounded-[4rem] bg-gray-50/20">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                   <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5em]">No verified partners in directory</p>
                <p className="text-[9px] text-gray-300 font-medium uppercase tracking-[0.2em] mt-2">New requests are currently under review by admin</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
