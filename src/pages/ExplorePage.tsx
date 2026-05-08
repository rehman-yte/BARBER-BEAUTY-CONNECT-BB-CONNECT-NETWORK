
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { getApprovedPartners, getSettings } from '../services/logic_engine';
import { useAuth } from '../context/AuthContext';
import { PersistenceService, StorageManager } from '../services/PersistenceService';

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>(['Barber', 'Beauty Parlour']);
  const [filter, setFilter] = useState<string>('Barber');
  const [allApprovedShops, setAllApprovedShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'partner') {
      navigate('/partner-dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [approvedShops, settings] = await Promise.all([
          getApprovedPartners(),
          getSettings()
        ]);
        setAllApprovedShops(approvedShops);
        if (settings?.system_config?.categories?.length > 0) {
          setCategories(settings.system_config.categories);
          setFilter(settings.system_config.categories[0]);
        }
      } catch (error: any) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const filteredShops = allApprovedShops.filter(s => s.category === filter);

  return (
    <div className="pt-[8rem] pb-[5rem] bg-white min-h-screen">
      <div className="max-w-[1440px] mx-auto px-[5%]">
        <header className="mb-[3rem] flex flex-col md:flex-row justify-between items-start md:items-end gap-[1rem]">
          <div>
            <h1 className="text-[2.5rem] md:text-[3.125rem] font-serif font-bold text-bbBlue-deep mb-[1rem] uppercase tracking-tight">Discover Excellence</h1>
            <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.3em]">Verified Network Professionals Only</p>
          </div>
        </header>

        {/* Category Tabs */}
        <div className="flex gap-[1rem] mb-[3rem] border-b border-gray-100 pb-[1rem] overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-[2rem] py-[0.75rem] text-[0.625rem] font-bold uppercase tracking-widest rounded-full transition-all whitespace-nowrap ${
                filter === cat ? 'bg-bbBlue text-white shadow-lg shadow-bbBlue/20' : 'text-gray-400 hover:text-bbBlue'
              }`}
            >
              {cat} Near You
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1.5rem] md:gap-[2.5rem]">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="col-span-full py-[10rem] flex flex-col items-center justify-center">
                <div className="w-[2.5rem] h-[2.5rem] border-4 border-bbBlue border-t-transparent rounded-full animate-spin mb-[1rem]"></div>
                <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-widest">Scanning Registry...</p>
              </div>
            ) : filteredShops.length > 0 ? (
              filteredShops.map((shop) => (
                <motion.div 
                  layout
                  key={shop.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden group shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col ${shop.shopStatus === 'closed' ? 'opacity-60 grayscale-[0.5]' : ''}`}
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img 
                      src={shop.shopImages?.[0] || shop.workerImages?.[0] || "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600"} 
                      alt={shop.brandName} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" 
                    />
                    <div className="absolute top-[1rem] left-[1rem] px-[0.75rem] py-[0.375rem] bg-white/90 backdrop-blur-sm rounded-full flex items-center gap-[0.375rem] shadow-sm z-10">
                      <div className={`w-[0.5rem] h-[0.5rem] rounded-full ${shop.shopStatus === 'open' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      <span className={`text-[0.5625rem] font-bold uppercase tracking-widest ${shop.shopStatus === 'open' ? 'text-green-600' : 'text-red-600'}`}>
                        {shop.shopStatus || 'closed'}
                      </span>
                    </div>
                    <div className="absolute top-[1rem] right-[1rem] px-[0.75rem] py-[0.375rem] bg-white/90 backdrop-blur-sm rounded-full flex items-center gap-[0.375rem] shadow-sm">
                      <span className="text-[0.625rem] font-bold text-bbBlue-deep">Verified</span>
                      <svg className="w-[0.875rem] h-[0.875rem] text-bbBlue" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </div>
                  </div>
                  <div className="p-[2rem] flex flex-col flex-grow">
                    <p className="text-[0.5625rem] font-bold text-bbBlue uppercase tracking-widest mb-[0.25rem]">{shop.category}</p>
                    <h3 className="text-[1.25rem] font-serif font-bold text-charcoal mb-[0.5rem] group-hover:text-bbBlue transition-colors">{shop.brandName}</h3>
                    
                    {/* Services Summary */}
                    <div className="flex flex-wrap gap-2 mb-[1.5rem]">
                      {(shop.services || []).slice(0, 3).map((svc: any, i: number) => (
                        <span key={i} className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[0.5rem] font-bold text-gray-400 tracking-wider uppercase">
                          {svc.name}
                        </span>
                      ))}
                      {shop.services?.length > 3 && (
                        <span className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[0.5rem] font-bold text-bbBlue tracking-wider uppercase">
                          +{shop.services.length - 3} More
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex justify-between items-center">
                      <div className="flex items-center gap-[0.75rem]">
                        <div className="w-[2rem] h-[2rem] rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[0.625rem] font-bold text-charcoal uppercase overflow-hidden">
                          {shop.ownerName?.[0] || 'M'}
                        </div>
                        <span className="text-[0.6875rem] font-bold text-gray-400 uppercase tracking-tighter">{shop.ownerName}</span>
                      </div>
                      {user?.role !== 'admin' && (
                        <Link 
                          to={`/shop/${shop.id}`}
                          className={`px-[1.25rem] py-[0.625rem] rounded-xl text-[0.625rem] font-bold uppercase tracking-widest transition-all active:scale-95 ${
                            (shop.shopStatus === 'closed' || !(shop.adminApproved || shop.status === 'approved')) 
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                              : 'bg-charcoal text-white hover:bg-bbBlue'
                          }`}
                          onClick={(e) => (shop.shopStatus === 'closed' || !(shop.adminApproved || shop.status === 'approved')) && e.preventDefault()}
                        >
                          {shop.shopStatus === 'closed' ? 'Closed' : 'Book Slot'}
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-[10rem] text-center border-2 border-dashed border-gray-100 rounded-[4rem] bg-gray-50/20">
                <div className="w-[5rem] h-[5rem] bg-white rounded-full flex items-center justify-center mx-auto mb-[1.5rem] shadow-sm border border-gray-100">
                   <svg className="w-[2rem] h-[2rem] text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <p className="text-[0.6875rem] font-bold text-gray-400 uppercase tracking-[0.5em]">No verified partners in directory</p>
                <p className="text-[0.5625rem] text-gray-300 font-medium uppercase tracking-[0.2em] mt-[0.5rem]">New requests are currently under review by admin</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
