
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Filter, Search, ChevronRight, Star, Menu, X, ShoppingBag, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  "All Products",
  "Barber Products",
  "Beauty Parlour Products",
  "Spa Products"
];

const SHOP_PRODUCTS = [
  {
    id: 'prod_1',
    name: "Professional Hair Trimmer with Titanium Blades",
    price: 4500,
    discount: 10,
    category: "Barber Products",
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
    reviews: 124
  },
  {
    id: 'prod_2',
    name: "Premium Facial Kit for Deep Rejuvenation",
    price: 1850,
    discount: 15,
    category: "Beauty Parlour Products",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=600",
    rating: 4.6,
    reviews: 89
  },
  {
    id: 'prod_3',
    name: "Pure Moroccan Argan Hair Oil - 100ml",
    price: 799,
    discount: 5,
    category: "Beauty Parlour Products",
    image: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    reviews: 210
  },
  {
    id: 'prod_4',
    name: "Natural Basalt Spa Massage Stones Set",
    price: 3200,
    discount: 20,
    category: "Spa Products",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=600",
    rating: 4.7,
    reviews: 56
  },
  {
    id: 'prod_5',
    name: "Luxury Beard Grooming Set with Sandalwood",
    price: 1450,
    discount: 12,
    category: "Barber Products",
    image: "https://images.unsplash.com/photo-1590156206657-9370929f44f5?auto=format&fit=crop&q=80&w=600",
    rating: 4.5,
    reviews: 167
  },
  {
    id: 'prod_6',
    name: "Luxury Scented Candle for Relaxation",
    price: 1200,
    discount: 0,
    category: "Spa Products",
    image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
    reviews: 42
  },
  {
    id: 'prod_7',
    name: "Professional Stainless Steel Scissors",
    price: 2800,
    discount: 8,
    category: "Barber Products",
    image: "https://images.unsplash.com/photo-1593702295094-ada74bc4a149?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    reviews: 78
  },
  {
    id: 'prod_8',
    name: "Organic Face Mask with Botanical Extracts",
    price: 950,
    discount: 10,
    category: "Beauty Parlour Products",
    image: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&q=80&w=600",
    rating: 4.4,
    reviews: 112
  }
];

const ShopPage: React.FC = () => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const filteredProducts = SHOP_PRODUCTS.filter(product => {
    const matchesCategory = activeCategory === "All Products" || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-sm font-bold text-charcoal uppercase tracking-[0.2em]">Shop by Category</h2>
      </div>
      <div className="flex-grow py-6 overflow-y-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-6 py-4 text-xs font-medium uppercase tracking-widest transition-all border-l-4 ${
              activeCategory === cat 
              ? 'bg-bbBlue/5 text-bbBlue border-bbBlue' 
              : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-charcoal'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Search Header (Amazon Style) */}
      <div className="bg-charcoal text-white py-4 px-[5%] sticky top-0 z-[100] shadow-md">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/10 rounded-lg outline-none focus:bg-white focus:text-charcoal transition-all text-white placeholder:text-gray-500 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => navigate('/checkout')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors relative"
          >
            <ShoppingBag size={24} />
          </button>
        </div>
      </div>

      <div className="flex flex-grow max-w-7xl mx-auto w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-gray-100 bg-white sticky top-[72px] h-[calc(100vh-72px)]">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[200] lg:hidden"
              />
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-72 bg-white z-[201] lg:hidden shadow-2xl"
              >
                <div className="flex justify-end p-4">
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-400 hover:text-charcoal">
                    <X size={24} />
                  </button>
                </div>
                <SidebarContent />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Product Grid */}
        <main className="flex-grow p-4 md:p-8">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-lg md:text-xl font-serif font-bold text-charcoal uppercase tracking-tight">
              {activeCategory}
              <span className="ml-2 text-xs font-sans font-normal text-gray-400 normal-case tracking-normal">
                ({filteredProducts.length} items)
              </span>
            </h1>

            {user?.role === 'admin' && (
              <button className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl text-[0.625rem] font-bold uppercase tracking-widest shadow-xl hover:bg-bbBlue transition-all active:scale-95">
                <Plus size={16} />
                List New Product
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={product.id}
                  className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {product.discount > 0 && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[0.5rem] font-bold uppercase tracking-widest">
                          {product.discount}% OFF
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 md:p-4 flex flex-col flex-grow">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex text-gold">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={8} fill={i < Math.floor(product.rating) ? "currentColor" : "none"} />
                        ))}
                      </div>
                      <span className="text-[0.5rem] text-gray-400 font-medium">({product.reviews})</span>
                    </div>
                    
                    <h3 className="text-xs md:text-sm font-medium text-charcoal mb-2 line-clamp-2 leading-tight h-8 md:h-10">
                      {product.name}
                    </h3>
                    
                    <div className="mt-auto">
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-sm md:text-lg font-bold text-charcoal">
                          ₹{Math.floor(product.price * (1 - product.discount / 100))}
                        </span>
                        {product.discount > 0 && (
                          <span className="text-[0.625rem] text-gray-400 line-through">₹{product.price}</span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => addToCart(product)}
                        className="w-full py-2 bg-bbBlue text-white rounded-lg text-[0.625rem] font-bold uppercase tracking-widest hover:bg-bbBlue-deep transition-all active:scale-95 shadow-sm"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-20 text-center">
              <Search className="mx-auto text-gray-200 mb-4" size={48} />
              <h3 className="text-lg font-serif font-bold text-charcoal mb-1">No items found</h3>
              <p className="text-gray-400 uppercase tracking-widest text-[0.625rem]">Try adjusting your search or filters</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ShopPage;

