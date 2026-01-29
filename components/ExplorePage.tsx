
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

    const q = query(collection(db, 'partners'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setShops(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Fetch Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredShops = filter === 'All' 
    ? shops 
    : shops.filter(shop => shop.type === filter);

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-bbBlue-deep mb-4">Discover Excellence</h1>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em]">Approved Professionals Only</p>
        </header>

        {/* Category Tabs */}
        <div className="flex gap-4 mb-12 border-b border-gray-100 pb-4">
          {['All', 'Barber', 'Beauty Parlour'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type as any)}
              className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all ${
                filter === type ? 'bg-bbBlue text-white shadow-lg shadow-bbBlue/20' : 'text-gray-400 hover:text-bbBlue'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="col-span-full py-40 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-bbBlue border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Scanning Network...</p>
              </div>
            ) : filteredShops.length > 0 ? (
              filteredShops.map((shop) => (
                <motion.div 
                  layout
                  key={shop.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-500"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img 
                      src={shop.image || shop.images?.[0] || "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600"} 
                      alt={shop.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-bbBlue-deep">{shop.rating || 'New'}</span>
                      <svg className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    </div>
                  </div>
                  <div className="p-8">
                    <p className="text-[9px] font-bold text-bbBlue uppercase tracking-widest mb-1">{shop.type}</p>
                    <h3 className="text-xl font-serif font-bold text-charcoal mb-4 group-hover:text-bbBlue transition-colors">{shop.name}</h3>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-bold text-charcoal">
                          {shop.owner?.[0] || 'P'}
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{shop.owner || 'Verified Partner'}</span>
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
              <div className="col-span-full py-40 text-center border-2 border-dashed border-gray-50 rounded-[3rem]">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em]">No active partners found in this directory</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
