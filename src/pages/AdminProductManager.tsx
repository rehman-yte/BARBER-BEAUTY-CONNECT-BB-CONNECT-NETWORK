import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getMarketplaceProducts, 
  addMarketplaceProduct, 
  deleteMarketplaceProduct 
} from '../services/logic_engine';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ExternalLink,
  DollarSign,
  Image as ImageIcon,
  Tag,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Package
} from 'lucide-react';

const AdminProductManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Force admin check
    if (!user || user.role !== 'admin') {
      navigate('/404', { replace: true });
      return;
    }
    fetchProducts();
  }, [user, navigate]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMarketplaceProducts();
      setProducts(data);
    } catch (err: any) {
      console.error(err);
      setError('Could not fetch marketplace products from database.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('A valid positive Price is required.');
      return;
    }

    setSubmitting(true);
    try {
      await addMarketplaceProduct({
        name,
        price: priceNum,
        imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600',
        sourceLink: sourceLink.trim()
      });

      // Clear Form
      setName('');
      setPrice('');
      setImageUrl('');
      setSourceLink('');

      showToast('Product listed on global marketplace successfully.');
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      setError('Failed to write and synchronize new product to marketplace.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    const doubleConfirm = window.confirm(`Are you sure you want to delete "${prodName}"?\nThis removes it from the global marketplace forever.`);
    if (!doubleConfirm) return;

    try {
      setError('');
      await deleteMarketplaceProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast(`Product "${prodName}" deleted.`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to delete marketplace product.');
    }
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans pb-16">
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
        <div className="mb-10">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0056b3] hover:text-[#004494] transition-all mb-4"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
          </button>
          <h1 className="text-4xl font-serif font-bold text-black uppercase tracking-tight flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#0056b3]" /> Marketplace Product Manager
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">
            Add & sync global affiliate products displayed to customers via Shopping icon (V1)
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Form to list product */}
          <div className="bg-white border border-gray-200 p-8 rounded-[2.5rem] shadow-sm lg:sticky lg:top-8">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-[#0056b3]" />
              <h2 className="text-lg font-serif font-bold uppercase">List New Product</h2>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-5">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Product Name</label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="e.g. Premium Beard Oil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 pl-11 pr-5 py-4 rounded-2xl font-bold text-xs outline-none focus:border-[#0056b3] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Price & Markup (₹)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g. 450.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 pl-11 pr-5 py-4 rounded-2xl font-bold text-xs outline-none focus:border-[#0056b3] transition-all"
                  />
                </div>
                <span className="text-[8px] text-gray-400 uppercase tracking-wide mt-1 block font-semibold leading-relaxed">
                  This exact price will be presented directly to end customers.
                </span>
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Image URL</label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="url" 
                    placeholder="e.g. https://domain.com/product.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 pl-11 pr-5 py-4 rounded-2xl font-bold text-xs outline-none focus:border-[#0056b3] transition-all"
                  />
                </div>
                {imageUrl.startsWith('http') && (
                  <div className="mt-2 text-center bg-gray-50 p-2 rounded-xl border border-gray-100 overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      className="max-h-24 mx-auto rounded-lg object-contain"
                      onError={(e) => {
                        (e.target as any).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Source / Retail Link</label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="url" 
                    placeholder="e.g. Amazon or original retail link"
                    value={sourceLink}
                    onChange={(e) => setSourceLink(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 pl-11 pr-5 py-4 rounded-2xl font-bold text-xs outline-none focus:border-[#0056b3] transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 animate-pulse">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-black text-white hover:bg-[#0056b3] py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg text-center"
                >
                  {submitting ? 'Writing to Firestore...' : 'Synchronize Product'}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Listed Products Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-serif font-bold text-black uppercase mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" /> Active Platform Catalog ({products.length})
            </h2>

            {loading ? (
              <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-[#0056b3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Querying Central Catalog...</p>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.map((product) => (
                  <motion.div 
                    layout
                    key={product.id}
                    className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group"
                  >
                    <div>
                      {/* Product display banner */}
                      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden border-b border-gray-50">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-4 right-4 bg-black text-white font-mono text-xs font-bold px-3.5 py-1.5 rounded-full border border-white/10">
                          ₹{product.price}
                        </span>
                      </div>

                      {/* Product metadata */}
                      <div className="p-6">
                        <h3 className="text-sm font-bold text-black font-serif uppercase tracking-tight truncate">
                          {product.name}
                        </h3>
                        <p className="text-[8px] text-gray-300 font-mono mt-1">UID: {product.id}</p>
                        
                        {product.sourceLink && (
                          <div className="mt-4 flex items-center gap-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Affiliate Destination:</span>
                            <a 
                              href={product.sourceLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-[#0056b3] hover:underline flex items-center gap-0.5"
                            >
                              Open <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="p-6 pt-0 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[8px] text-gray-400 uppercase tracking-widest font-black font-sans">
                        {product.createdAt ? 'Synced' : 'Preconfigured'}
                      </span>
                      <button 
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="p-3 text-red-500 hover:text-white hover:bg-red-500 border border-red-100 hover:border-red-500 rounded-xl transition-all"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 border border-dashed border-gray-200 rounded-[2.5rem] bg-white">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">The active product catalog is currently blank.</p>
                <p className="text-[9px] text-gray-300 uppercase tracking-widest mt-1">Use the override widget to list products synchronously.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminProductManager;
