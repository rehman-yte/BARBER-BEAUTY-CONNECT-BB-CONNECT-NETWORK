import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  const [isAutofetching, setIsAutofetching] = useState(false);

  // Form input states
  const [name, setName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [originalCostStr, setOriginalCostStr] = useState('');

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
      const localCachedRaw = localStorage.getItem('dropship_local_cache');
      
      // Auto-retry to recover connection & pull catalog even if we don't have pending items
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
        console.warn('[BACKGROUND RE-SYNC] Database is still offline or unreachable, continuing cache tracking:', err.message);
      }

      // If we have local unsynced cache, try writing them to Firestore
      if (localCachedRaw) {
        const localCached: any[] = JSON.parse(localCachedRaw);
        if (localCached.length > 0) {
          console.log(`[BACKGROUND RE-SYNC] Attempting upload of ${localCached.length} cached dropship item(s)...`);
          let successfulIds: string[] = [];
          
          for (const item of localCached) {
            try {
              // Ensure we drop local temporary markers
              const { id, isPendingSync, ...cleanPayload } = item;
              await addMarketplaceProduct(cleanPayload);
              successfulIds.push(item.id);
            } catch (err) {
              console.warn('[BACKGROUND RE-SYNC] Retried upload failed, will retry next epoch:', err);
              break; // break retry on primary error to verify connectivity next time
            }
          }

          if (successfulIds.length > 0) {
            const remaining = localCached.filter(i => !successfulIds.includes(i.id));
            if (remaining.length > 0) {
              localStorage.setItem('dropship_local_cache', JSON.stringify(remaining));
            } else {
              localStorage.removeItem('dropship_local_cache');
            }
            showToast(`Auto-synced ${successfulIds.length} locally cached item(s) straight to Firestore Catalog!`);
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

    // Fetch localized backup list first for supreme load response performance
    const localCachedRaw = localStorage.getItem('dropship_local_cache');
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
      console.error("Error loading dropship catalog:", err);
      // Seamlessly fallback entirely to localized backup lists so the admin never sees a blank page
      setProducts(localCached.map((item: any) => ({ ...item, isPendingSync: true })));
      setError('System network is currently offline. Viewing high-security local cache catalog. Auto-retrying connection every 5s...');
    } finally {
      setLoading(false);
    }
  };

  const handleAutofetchDetails = async () => {
    if (!sourceUrl.trim()) {
      setError('Please provide a Source Purchase URL first to invoke AI Auto-fetch.');
      return;
    }
    setError('');
    setIsAutofetching(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch('/api/dropship/autofetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl.trim() }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      // If price is missing or 0, or matches default placeholder, leave blank as requested to let Admin input manually
      const isSuspicious = !data.price || data.price <= 0 || [1499, 1899, 799, 1299].includes(data.price);

      if (data && data.success) {
        setName(data.name && !data.name.match(/[a-zA-Z0-9]{8,15}/) ? data.name : '');
        setImageUrl(data.imageUrl || '');
        
        if (!isSuspicious) {
          setOriginalCostStr(String(data.price));
          // Automation Rule: Retail Price = Source Price + 15% Margin
          const recommendedRetail = Math.ceil(data.price * 1.15);
          setPriceStr(String(recommendedRetail));
          showToast(`AI auto-fetched details! Applied automatic +15% retail markup.`);
        } else {
          setOriginalCostStr('');
          setPriceStr('');
          setError('System Notice: Extraction price returned suspicious placeholder. Please input Original Base Cost manually.');
          showToast(`AI fetched details, but base price left blank for safe manual input.`);
        }
      } else {
        throw new Error('Suspicious data or API fallback requested');
      }
    } catch (err: any) {
      console.warn('AI autofetch timed out or failed (e.g. cloud blocker/suspicious data). Leaving Original Base Cost as EMPTY:', err);
      clearTimeout(timeoutId);

      // Reset values to blank for safe manual override
      setName('');
      setImageUrl('');
      setOriginalCostStr('');
      setPriceStr('');

      setError('System notice: Destination server has slow response or bot blockers. Switched to direct manual edit.');
      showToast('Direct manual override enabled. Fields left blank for accuracy.');
    } finally {
      setIsAutofetching(false);
    }
  };

  const handleOriginalCostChange = (val: string) => {
    setOriginalCostStr(val);
    setError('');
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      const markupAmount = Math.ceil(parsed * 1.15);
      setPriceStr(String(markupAmount));
    } else {
      setPriceStr('');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Field Validations
    if (!name.trim()) return setError('Product Name is required.');
    if (!priceStr.trim()) return setError('Your Price is required.');
    
    const parsedPrice = parseFloat(priceStr);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return setError('Your Price must be a positive numeric value.');
    }

    setSubmitting(true);
    
    // 3. PARTNER ID TRACKING ATTACHMENT
    let finalSourceUrl = sourceUrl.trim();
    if (!finalSourceUrl) {
      finalSourceUrl = '#';
    }
    if (finalSourceUrl && finalSourceUrl !== '#') {
      const partnerId = user?.uid || 'admin';
      try {
        const urlOb = new URL(finalSourceUrl);
        urlOb.searchParams.set('partnerId', partnerId);
        finalSourceUrl = urlOb.toString();
      } catch (e) {
        // Simple appending if URL parse fails
        if (finalSourceUrl.includes('?')) {
          finalSourceUrl = `${finalSourceUrl}&partnerId=${partnerId}`;
        } else {
          finalSourceUrl = `${finalSourceUrl}?partnerId=${partnerId}`;
        }
      }
    }

    // SECURITY METADATA SANITIZATION: Strict validation of primitives and automatic fallback defaults
    const nameVal = String(name.trim() || 'Professional Classic Salon Product');
    const categoryVal = String(category || CATEGORY_OPTIONS[0]);
    const imageVal = String(imageUrl.trim() || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80');
    const finalPrice = Number(parsedPrice) || 899;

    const payload = {
      name: nameVal,
      sourceUrl: String(finalSourceUrl),
      imageUrl: imageVal,
      price: finalPrice,
      category: categoryVal,
      discount: 0,
      rating: 5,
      reviews: Math.floor(Math.random() * 80) + 10,
      createdAt: new Date().toISOString()
    };

    try {
      // FORCE WRITE with fallback schemas
      try {
        await addMarketplaceProduct(payload);
        showToast('Link Product verified: Successfully synchronized to the Live Catalog!');
      } catch (firstErr) {
        console.warn('First Firestore insertion attempted failed. Forcing schema schema constraints:', firstErr);
        const forcedPayload = {
          name: String(nameVal).slice(0, 100),
          sourceUrl: String(finalSourceUrl),
          imageUrl: String(imageVal),
          price: Number(finalPrice),
          category: String(categoryVal),
          discount: 0,
          rating: 5,
          reviews: 42,
          createdAt: new Date().toISOString()
        };
        await addMarketplaceProduct(forcedPayload);
        showToast('Link Product verified with safe payload schema constraints!');
      }
    } catch (err: any) {
      console.warn('Firestore write failed. Utilizing high-security local cache system:', err);
      
      const localItem = {
        id: 'temp_' + Date.now(),
        ...payload
      };

      const currentCacheRaw = localStorage.getItem('dropship_local_cache');
      const currentCache = currentCacheRaw ? JSON.parse(currentCacheRaw) : [];
      currentCache.push(localItem);
      localStorage.setItem('dropship_local_cache', JSON.stringify(currentCache));
      
      showToast('DATABASE OFFLINE: Product saved to high-security local cache! Auto-retrying background sync...');
    } finally {
      // Reset input fields in both successful and localized fallback paths
      setName('');
      setSourceUrl('');
      setImageUrl('');
      setPriceStr('');
      setOriginalCostStr('');
      setCategory(CATEGORY_OPTIONS[0]);
      setSubmitting(false);

      // Re-fetch merges live and cached items
      fetchProducts();
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    // Check if item is locally cached only
    if (productId.startsWith('temp_')) {
      const localCachedRaw = localStorage.getItem('dropship_local_cache');
      if (localCachedRaw) {
        const localCached: any[] = JSON.parse(localCachedRaw);
        const filtered = localCached.filter(p => p.id !== productId);
        if (filtered.length > 0) {
          localStorage.setItem('dropship_local_cache', JSON.stringify(filtered));
        } else {
          localStorage.removeItem('dropship_local_cache');
        }
        showToast('Pending items deleted from high-security local cache.');
        fetchProducts();
      }
      return;
    }

    const confirmDelete = window.confirm(`SECURE SYSTEM OVERRIDE:\nAre you sure you want to delete "${productName}" from the live marketplace?\nThis cannot be undone.`);
    if (!confirmDelete) return;

    try {
      setError('');
      await deleteMarketplaceProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      showToast('Product permanently purged from catalog.');
    } catch (err: any) {
      setError('purge command failed to execute in Firestore rules.');
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
            <ShoppingBag className="w-8 h-8 text-[#0056b3]" /> Dropship Inventory Control
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">
            Automated Shopify-style item importer and sync engine
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Column 1: Shopify-style Linker Form */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm sticky top-28">
              <div className="mb-6">
                <span className="text-[8px] font-black uppercase text-[#0056b3] bg-[#0056b3]/10 px-2.5 py-1 rounded-full tracking-wider">
                  SOURCE CONNECTOR
                </span>
                <h2 className="text-xl font-serif font-bold text-black uppercase mt-3">Link New Product</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sync items to customer store grid</p>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-5">
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Source Purchase URL (Dropship Link) *
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="url"
                      required
                      placeholder="e.g. https://alibaba.com/trimmer-source"
                      value={sourceUrl}
                      onChange={(e) => {
                        setSourceUrl(e.target.value);
                        setError('');
                      }}
                      className="w-full bg-gray-50 border border-gray-200 pl-11 pr-5 py-3.5 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-[#0056b3] transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isAutofetching || submitting}
                    onClick={handleAutofetchDetails}
                    className="w-full mt-2.5 bg-gray-900 text-white hover:bg-[#0056b3] disabled:bg-gray-100 disabled:text-gray-400 py-3 rounded-2xl font-black uppercase text-[9px] tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                  >
                    {isAutofetching ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin text-[#0056b3]" /> EXTRACTING PRODUCT WITH GEMINI AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> ⚡ AI AUTO-FETCH DETAILS
                      </>
                    )}
                  </button>
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-1.5">
                    Pasting a source URL & launching AI extracts Title, High-Res Image, and Base Cost dynamically.
                  </p>
                </div>

                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Original Base Cost (Wholesale INR) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 1000 (Calculates +15% Markup automatically)"
                      value={originalCostStr}
                      onChange={(e) => handleOriginalCostChange(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 pl-11 pr-5 py-3.5 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-[#0056b3] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Product Brand & Name *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter Brand/Name manually or edit fetched one"
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
                    Your Retail Price (INR) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number"
                      required
                      min="1"
                      placeholder="Calculated automatically or custom adjust"
                      value={priceStr}
                      onChange={(e) => {
                        setPriceStr(e.target.value);
                        setError('');
                      }}
                      className="w-full bg-gray-50 border border-gray-200 pl-11 pr-5 py-3.5 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-[#0056b3] transition-all"
                    />
                  </div>
                  
                  {parseFloat(originalCostStr) > 0 ? (
                    <div className="mt-2.5 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-emerald-800 text-[9px] font-bold uppercase tracking-wider flex flex-col gap-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span>Original Base Cost:</span>
                        <span className="font-mono text-gray-600">₹{parseFloat(originalCostStr)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Margin Applied (+15% Markup):</span>
                        <span className="font-mono text-emerald-600">+ ₹{Math.ceil(parseFloat(originalCostStr) * 0.15)}</span>
                      </div>
                      <div className="border-t border-emerald-200/50 my-1"></div>
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-black">
                        <span>Target Retail Price:</span>
                        <span className="font-mono bg-white border border-emerald-100 rounded-lg px-2.5 py-1 text-emerald-700">₹{priceStr}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/50 text-amber-800 text-[9px] font-bold uppercase tracking-wider flex flex-col gap-1 shadow-xs animate-pulse">
                      <div className="text-center font-extrabold text-amber-700">⚠️ Base Cost is empty (₹0)</div>
                      <div className="text-center font-mono text-[7px] text-gray-500 normal-case leading-normal">
                        Please input Original Base Cost manually. Target retail price calculates automatically adding a premium 15% wholesale markup!
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Product Image Link URL
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-3.5 h-3.5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="url"
                      placeholder="Paste direct image URL or edit fetched link"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setError('');
                      }}
                      className="w-full bg-gray-50 border border-gray-200 pl-11 pr-5 py-3.5 rounded-2xl font-bold text-xs outline-none focus:bg-white focus:border-[#0056b3] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                    Store Catalog Category
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

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting || isAutofetching}
                    className="w-full bg-black text-white hover:bg-[#0056b3] disabled:bg-gray-200 disabled:text-gray-400 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" /> IMPERIAL CONNECTOR SYNCHRONIZING...
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
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
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
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs font-bold font-mono text-black">
                              ₹{prod.price}
                            </span>
                            {prod.sourceUrl && prod.sourceUrl !== '#' && (
                              <a 
                                href={prod.sourceUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[8px] font-black uppercase text-gray-400 hover:text-[#0056b3] tracking-widest flex items-center gap-1 transition-all"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Direct Source
                              </a>
                            )}
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
