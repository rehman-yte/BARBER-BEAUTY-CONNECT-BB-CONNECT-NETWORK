
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CustomerAuthModal from './CustomerAuthModal';

interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  image: string;
  description: string;
  features: string[];
}

const GENUINE_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: "Professional Hair Trimmer",
    price: "₹4,500",
    category: "Barber",
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=600",
    description: "Engineered for precision and durability, this professional-grade trimmer features self-sharpening titanium blades and a high-torque motor for seamless grooming.",
    features: ["4-hour battery life", "Precision titanium blades", "Ergonomic grip", "Water-resistant"]
  },
  {
    id: 'prod_2',
    name: "Premium Facial Kit",
    price: "₹1,850",
    category: "Beauty Parlour",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=600",
    description: "A complete 6-step rejuvenation system infused with gold dust and botanical extracts to restore natural glow and deep-cleanse pores.",
    features: ["Gold dust infusion", "Dermatologically tested", "Suitable for all skin types", "Includes deep cleanser & mask"]
  },
  {
    id: 'prod_3',
    name: "Argan Hair Oil",
    price: "₹799",
    category: "Hair Care",
    image: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&q=80&w=600",
    description: "Pure Moroccan Argan oil enriched with Vitamin E. Restores shine, reduces frizz, and strengthens hair from root to tip.",
    features: ["100% Organic", "Cold-pressed", "Non-greasy formula", "Heat protection"]
  },
  {
    id: 'prod_4',
    name: "Spa Massage Stones",
    price: "₹3,200",
    category: "Spa",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=600",
    description: "Hand-picked basalt stones that retain heat for extended periods, perfect for deep tissue relaxation and stress relief.",
    features: ["Natural basalt", "Set of 12 stones", "Smooth finish", "Includes heating bag"]
  },
  {
    id: 'prod_5',
    name: "Beard Grooming Set",
    price: "₹1,450",
    category: "Barber",
    image: "https://images.unsplash.com/photo-1590156206657-9370929f44f5?auto=format&fit=crop&q=80&w=600",
    description: "The ultimate kit for the modern gentleman. Includes sandalwood beard oil, balm, and a premium boar bristle brush.",
    features: ["Sandalwood scent", "Boar bristle brush", "Organic ingredients", "Travel-friendly pouch"]
  }
];

const ProductShowcase: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { addToCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>(GENUINE_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // ... (keeping existing fetch logic commented out if any)

  const closeModal = () => {
    setSelectedProduct(null);
    setIsAdded(false);
    setPendingPath(null);
  };

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    if (selectedProduct) {
      addToCart(selectedProduct);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const handleProtectedNavigation = (path: string) => {
    if (isLoggedIn) {
      navigate(path);
    } else {
      setPendingPath(path);
      setShowAuthModal(true);
    }
  };

  return (
    <section className="py-12 bg-white w-full relative">
      <div className="max-w-[1440px] mx-auto px-[5%]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-blue-600 uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>NETWORK INVENTORY</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight">
              CURATED ESSENTIALS
            </h2>
          </div>
          <button 
            onClick={() => handleProtectedNavigation('/shop')}
            className="px-5 py-2.5 bg-black hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[3px_3px_0px_0px_#0052FF] active:scale-95"
          >
            View All Products →
          </button>
        </div>

        <div className="relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pb-6">
            {products.slice(0, 4).map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ y: -4 }}
                className="w-full bg-white border-2 border-black rounded-2xl md:rounded-3xl overflow-hidden shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#0052FF] transition-all group/card flex flex-col justify-between"
              >
                <div className="relative h-36 md:h-56 overflow-hidden bg-gray-100 border-b-2 border-black">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 md:top-3 md:left-3">
                    <span className="bg-black text-white border border-white/20 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm">
                      {product.category}
                    </span>
                  </div>
                </div>
                <div className="p-3 md:p-5 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-black mb-1 truncate">{product.name}</h3>
                    <p className="text-blue-600 font-mono font-black text-sm md:text-lg">{product.price}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedProduct(product)}
                    className="w-full py-2 md:py-2.5 bg-gray-100 hover:bg-blue-600 text-black hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-black/20"
                  >
                    View Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-[12px_12px_0px_0px_#0052FF] border-3 border-black flex flex-col md:flex-row max-h-[90vh]"
            >
              <button 
                onClick={closeModal}
                className="absolute top-5 right-5 z-10 p-2.5 bg-black text-white rounded-xl hover:bg-blue-600 transition-colors shadow-md border border-white/20"
              >
                <X size={20} />
              </button>

              <div className="w-full md:w-1/2 h-64 md:h-auto relative bg-gray-100 border-b-2 md:border-b-0 md:border-r-2 border-black">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-6 left-6">
                  <span className="bg-black text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg border border-white/20">
                    {selectedProduct.category}
                  </span>
                </div>
              </div>

              <div className="w-full md:w-1/2 p-8 md:p-10 overflow-y-auto flex flex-col justify-between">
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl md:text-3xl font-black text-black mb-2 uppercase tracking-tight">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-3xl font-mono font-black text-blue-600">{selectedProduct.price}</p>
                  </div>

                  <div className="space-y-6 mb-8">
                    <div>
                      <h4 className="text-xs font-mono font-bold text-black/60 uppercase tracking-widest mb-2">Description</h4>
                      <p className="text-black/80 font-medium leading-relaxed text-sm md:text-base">
                        {selectedProduct.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-mono font-bold text-black/60 uppercase tracking-widest mb-2">Key Specifications</h4>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedProduct.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs font-bold text-black">
                            <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-black/10">
                  <button 
                    onClick={handleAddToCart}
                    className={`flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 border-2 border-black active:scale-[0.98] ${
                      isAdded 
                        ? 'bg-emerald-500 text-white shadow-md' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-[3px_3px_0px_0px_#000000]'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check size={18} />
                        Added to Basket
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={18} />
                        Add to Cart
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      if (!isLoggedIn) {
                        setShowAuthModal(true);
                        return;
                      }
                      if (selectedProduct) {
                        addToCart(selectedProduct);
                        navigate('/checkout');
                      }
                    }}
                    className="flex-1 py-3.5 bg-black hover:bg-zinc-800 text-white rounded-xl font-black uppercase text-xs tracking-wider transition-all border-2 border-black shadow-[3px_3px_0px_0px_#0052FF] active:scale-[0.98]"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <CustomerAuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={() => {
          if (pendingPath) navigate(pendingPath);
        }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-thin::-webkit-scrollbar {
          height: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 20px;
        }
        .group:hover .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #e5e7eb;
        }
        .group:hover .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #3B82F6;
        }
      `}} />
    </section>
  );
};

export default ProductShowcase;
