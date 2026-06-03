import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { 
  addMarketplaceProduct, 
  getMarketplaceProducts, 
  deleteMarketplaceProduct 
} from '../services/logic_engine';
import { 
  ShoppingBag, 
  ArrowLeft, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  IndianRupee, 
  Plus, 
  Trash2, 
  ExternalLink,
  ShieldAlert,
  Loader,
  Sparkles,
  Zap
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  "Barber Products",
  "Beauty Parlour Products",
  "Spa Products"
];

const AdminDropship: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Loading & logs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form input states
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [description, setDescription] = useState('');

  // Product List
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    // Authority Lock Checked
    if (!user || user.role !== 'admin') {
      navigate('/404', { replace: true });
      return;
    }
    fetchProducts();
  }, [user, navigate]);

  // Fail-Safe background synchronization & connection auto-recovery
  useEffect(() => {
    const intervalId = setInterval(async () => {
      const localCachedRaw = localStorage.getItem('manual_local_cache');
      
      try {
        const data = await getMarketplaceProducts();
        
        // Connection recovered!
        if (error && error.includes('offline')) {
          setError('');
        }

        const finalCached = localCachedRaw ? JSON.parse(localCachedRaw) : [];
        const merged = [
          ...finalCached.map((item: any) => ({ ...item, isPendingSync: true })),
          ...data
        ];
        // Sort by creation time descend
        setProducts(merged.sort((a, b) => {
          const timeA = a.createdAt || '';
          const timeB = b.createdAt || '';
          return timeB.localeCompare(timeA);
        }));
      } catch (err: any) {
        console.warn('[BACKGROUND RE-SYNC] Database is still offline or unreachable:', err.message);
      }

      // If we have local unsynced cache, try writing them to Firestore
      if (localCachedRaw) {
        const localCached: any[] = JSON.parse(localCachedRaw);
        if (localCached.length > 0) {
          console.log(`[BACKGROUND RE-SYNC] Attempting upload of ${localCached.length} cached items...`);
          let successfulIds: string[] = [];
          
          for (const item of localCached) {
            try {
              const { id, isPendingSync, ...cleanPayload } = item;
              await addMarketplaceProduct(cleanPayload);
              successfulIds.push(item.id);
            } catch (err) {
              console.warn('[BACKGROUND RE-SYNC] Retried upload failed, will retry next epoch:', err);
              break; 
            }
          }

          if (successfulIds.length > 0) {
            const remaining = localCached.filter(i => !successfulIds.includes(i.id));
            if (remaining.length > 0) {
              localStorage.setItem('manual_local_cache', JSON.stringify(remaining));
            } else {
              localStorage.removeItem('manual_local_cache');
            }
            showToast(`Auto-synced ${successfulIds.length} locally cached items straight to Firestore Catalog!`);
            fetchProducts();
          }
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [error]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');

    const localCachedRaw = localStorage.getItem('manual_local_cache');
    const localCached = localCachedRaw ? JSON.parse(localCachedRaw) : [];

    try {
      const data = await getMarketplaceProducts();
      const merged = [
        ...localCached.map((item: any) => ({ ...item, isPendingSync: true })),
        ...data
      ];
      setProducts(merged.sort((a, b) => {
        const timeA = a.createdAt || '';
        const timeB = b.createdAt || '';
        return timeB.localeCompare(timeA);
      }));
    } catch (err: any) {
      console.error("Error loading products catalog:", err);
      setProducts(localCached.map((item: any) => ({ ...item, isPendingSync: true })));
      setError('System network is currently offline. Viewing local cache catalog. Auto-retrying connection every 5s...');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Field Validations
    if (!name.trim()) return setError('Product Title is required.');
    if (!priceStr.trim()) return setError('Retail Price is required.');
    if (!imageUrl.trim()) return setError('Product Image URL is required.');
    
    const parsedPrice = parseFloat(priceStr);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return setError('Retail Price must be a positive numeric value.');
    }

    setSubmitting(true);
    
    const nameVal = String(name.trim());
    const categoryVal = String(category || CATEGORY_OPTIONS[0]);
    const imageVal = String(imageUrl.trim());
    const finalPrice = Number(parsedPrice);
    const descriptionVal = String(description.trim() || 'No description provided.');

    const payload = {
      name: nameVal,
      sourceUrl: '#',
      imageUrl: imageVal,
      price: finalPrice,
      category: categoryVal,
      description: descriptionVal,
      discount: 0,
      rating: 5,
      reviews: Math.floor(Math.random() * 80) + 10,
      createdAt: new Date().toISOString()
    };

    try {
      try {
        await addMarketplaceProduct(payload);
        showToast('Successfully synchronized product to the Live Catalog!');
      } catch (firstErr) {
        console.warn('First Firestore insertion attempted failed. Forcing schema constraints:', firstErr);
        const forcedPayload = {
          name: String(nameVal).slice(0, 100),
          sourceUrl: '#',
          imageUrl: String(imageVal),
          price: Number(finalPrice),
          category: String(categoryVal),
          description: descriptionVal,
          discount: 0,
          rating: 5,
          reviews: 42,
          createdAt: new Date().toISOString()
        };
        await addMarketplaceProduct(forcedPayload);
        showToast('Successfully synchronized product with safe constraints!');
      }
    } catch (err: any) {
      console.warn('Firestore write failed. Utilizing local cache system:', err);
      
      const localItem = {
        id: 'temp_' + Date.now(),
        ...payload
      };

      const currentCacheRaw = localStorage.getItem('manual_local_cache');
      const currentCache = currentCacheRaw ? JSON.parse(currentCacheRaw) : [];
      currentCache.push(localItem);
      localStorage.setItem('manual_local_cache', JSON.stringify(currentCache));
      
      showToast('DATABASE OFFLINE: Product saved to manual local cache! Auto-retrying background sync...');
    } finally {
      setName('');
      setImageUrl('');
      setPriceStr('');
      setDescription('');
      setCategory(CATEGORY_OPTIONS[0]);
      setSubmitting(false);

      fetchProducts();
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (productId.startsWith('temp_')) {
      const localCachedRaw = localStorage.getItem('manual_local_cache');
      if (localCachedRaw) {
        const localCached: any[] = JSON.parse(localCachedRaw);
        const filtered = localCached.filter(p => p.id !== productId);
        if (filtered.length > 0) {
          localStorage.setItem('manual_local_cache', JSON.stringify(filtered));
        } else {
          localStorage.removeItem('manual_local_cache');
        }
        showToast('Pending item deleted from local cache.');
        fetchProducts();
      }
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete "${productName}" from the live marketplace?`);
    if (!confirmDelete) return;

    try {
      setError('');
      await deleteMarketplaceProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      showToast('Product permanently purged from catalog.');
    } catch (err: any) {
      setError('Purge command failed to execute in Firestore rules.');
    }
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans pb-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[3000] bg-black text-white px-8 py-4 rounded-full border border-white/10 shadow-2xl flex items-center gap-3"
          >
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <p className="text-[10px] font-black uppercase tracking-widest">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        {/* Navigation & Header */}
        <div className="mb-12">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0056b3] hover:text-[#004494] transition-all mb-4"
          >
            <ArrowLeft className="w-3 h-3" /> Back to command dashboard
          </button>
          <h1 className="text-4xl font-serif font-bold text-black tracking-tight uppercase flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#0056b3]" /> Manage Inventory
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">
            Add and update products manually inside the localized store catalog
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Column 1: Manual Input Form */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm justify-between flex flex-col">
              <div className="mb-6">
                <span className="text-[8px] font-black uppercase text-[#0056b3] bg-[#0056b3]/10 px-2.5 py-1 rounded-full tracking-wider">
                  NATIVE CONTROL
                </span>
                <h2 className="text-xl font-serif font-bold text-black uppercase mt-3">Link New Product</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Direct insert parameters to live catalog</p>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-5">
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Product Title *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Premium Pro Cordless Hair Trimmer"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    className="w-full bg-gray-50 border border-gray-200 px-5 py-3.5 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-[#0056b3] transition-all"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Store Catalog Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-5 py-3.5 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-[#0056b3] transition-all cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Your Retail Price (INR) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 1299"
                      value={priceStr}
                      onChange={(e) => {
                        setPriceStr(e.target.value);
                        setError('');
                      }}
                      className="w-full bg-gray-50 border border-gray-200 pl-11 pr-5 py-3.5 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-[#0056b3] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Product Description *
                  </label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="Write detailed specifications & description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-5 py-3.5 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-[#0056b3] transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Product Image Link URL *
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-3.5 h-3.5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="url"
                      required
                      placeholder="e.g. https://images.unsplash.com/photo-..."
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setError('');
                      }}
                      className="w-full bg-gray-50 border border-gray-200 pl-11 pr-5 py-3.5 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-[#0056b3] transition-all"
                    />
                  </div>
                  {imageUrl.trim() && (
                    <div className="mt-2 text-center">
                      <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden mx-auto bg-white shadow-xs">
                        <img 
                          src={imageUrl} 
                          alt="Manual product link preview" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=100&q=80';
                          }}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-gray-400 uppercase block mt-1">Image Preview</span>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-black text-white hover:bg-[#0056b3] disabled:bg-gray-200 disabled:text-gray-400 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" /> SYNCHRONIZING TO CATALOG...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> LINK PRODUCT TO MARKET
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Column 2 & 3: Current Linked Inventory List */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
              <div className="mb-8 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-serif font-bold text-black uppercase">Linked Catalog</h2>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Items synchronized to the customer shopping portal</p>
                </div>
                <span className="bg-gray-100 text-gray-600 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase">
                  {products.length} Products
                </span>
              </div>

              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center">
                  <Loader className="w-10 h-10 text-[#0056b3] animate-spin mb-4" />
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Querying Inventory registry...</p>
                </div>
              ) : products.length > 0 ? (
                <div className="space-y-4">
                  {products.map((prod) => (
                    <div 
                      key={prod.id}
                      className="border border-gray-100 rounded-3xl p-5 hover:border-gray-200 hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 flex-shrink-0">
                          <img 
                            src={prod.imageUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=100&q=80'} 
                            alt={prod.name}
                            className="w-full h-full object-cover transition-opacity duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              console.warn('[IMAGE FAILSAFE] URL failed to resolve, fell back securely to preset placeholder.');
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=100&q=80';
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-[9px] font-black uppercase text-[#0056b3] tracking-wider">
                              {prod.category}
                            </span>
                            {prod.isPendingSync && (
                              <span className="text-[7.5px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black tracking-widest animate-pulse uppercase">
                                PENDING CLOUD SYNC
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold font-serif text-black leading-snug">
                            {prod.name}
                          </h3>
                          {prod.description && (
                            <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                              {prod.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs font-bold font-mono text-black">
                              ₹{prod.price}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteProduct(prod.id, prod.name)}
                        className="px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-50 text-red-600 bg-red-50/20 hover:bg-red-50 transition-all flex items-center gap-1.5 self-end sm:self-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Purge Item
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                    No linked products in the live_marketplace collection yet.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminDropship;
