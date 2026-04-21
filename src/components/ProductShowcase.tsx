
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

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
  const { addToCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>(GENUINE_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  // FUTURE FIRESTORE INTEGRATION
  /*
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);
  */

  const closeModal = () => {
    setSelectedProduct(null);
    setIsAdded(false);
  };

  const handleAddToCart = () => {
    if (selectedProduct) {
      addToCart(selectedProduct);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  return (
    <section className="py-12 bg-white w-full relative">
      <div className="max-w-[1440px] mx-auto px-[5%]">
        <div className="flex justify-between items-end mb-12">
          <div>
            <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.4em] mb-2">Network Inventory</p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-charcoal uppercase tracking-tight">
              Premium Essentials
            </h2>
          </div>
          <button 
            onClick={() => navigate('/shop')}
            className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-widest hover:text-bbBlue-deep transition-colors border-b border-bbBlue/20 pb-1"
          >
            View All Products
          </button>
        </div>

        <div className="relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 pb-8">
            {products.slice(0, 4).map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ y: -5 }}
                className="w-full bg-white border border-gray-100 rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-bbBlue/5 transition-all group/card"
              >
                <div className="relative h-32 md:h-64 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 md:top-4 md:left-4">
                    <span className="bg-white/90 backdrop-blur-md px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[0.4rem] md:text-[0.5rem] font-bold text-charcoal uppercase tracking-widest shadow-sm">
                      {product.category}
                    </span>
                  </div>
                </div>
                <div className="p-3 md:p-6">
                  <h3 className="text-[0.75rem] md:text-lg font-serif font-bold text-charcoal mb-0.5 md:mb-1 truncate">{product.name}</h3>
                  <p className="text-bbBlue font-mono font-bold text-[0.625rem] md:text-sm mb-3 md:mb-4">{product.price}</p>
                  <button 
                    onClick={() => setSelectedProduct(product)}
                    className="w-full py-2 md:py-3 bg-gray-50 text-charcoal rounded-lg md:rounded-xl text-[0.5rem] md:text-[0.625rem] font-bold uppercase tracking-widest hover:bg-bbBlue hover:text-white transition-all"
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              <button 
                onClick={closeModal}
                className="absolute top-6 right-6 z-10 p-3 bg-white/80 backdrop-blur-md rounded-full text-charcoal hover:bg-bbBlue hover:text-white transition-all shadow-lg"
              >
                <X size={20} />
              </button>

              <div className="w-full md:w-1/2 h-64 md:h-auto relative">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-8 left-8">
                  <span className="bg-bbBlue text-white px-4 py-1.5 rounded-full text-[0.625rem] font-bold uppercase tracking-[0.2em] shadow-lg">
                    {selectedProduct.category}
                  </span>
                </div>
              </div>

              <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto">
                <div className="mb-8">
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-2 leading-tight">
                    {selectedProduct.name}
                  </h2>
                  <p className="text-2xl font-mono font-bold text-bbBlue">{selectedProduct.price}</p>
                </div>

                <div className="space-y-6 mb-10">
                  <div>
                    <h4 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">Description</h4>
                    <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                      {selectedProduct.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">Key Features</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedProduct.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-[0.75rem] font-medium text-charcoal">
                          <div className="w-1.5 h-1.5 rounded-full bg-bbBlue" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                  <button 
                    onClick={handleAddToCart}
                    className={`flex-1 py-4 rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.3em] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${
                      isAdded ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-bbBlue text-white shadow-bbBlue/20 hover:bg-blue-600'
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
                    onClick={closeModal}
                    className="flex-1 py-4 border border-gray-200 text-charcoal rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.3em] hover:bg-gray-50 transition-all active:scale-[0.98]"
                  >
                    Back to Shop
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
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
