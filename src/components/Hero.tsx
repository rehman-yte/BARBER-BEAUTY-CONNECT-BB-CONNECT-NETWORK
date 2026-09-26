
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CustomerAuthModal from './CustomerAuthModal';
import { 
  Sparkles, Star, ShieldCheck, ArrowRight, Scissors, Clock, 
  MapPin, ChevronRight, ChevronLeft, Zap, CheckCircle2, Flame,
  Search, SlidersHorizontal, Calendar
} from 'lucide-react';

type AtelierCategory = 'barber' | 'parlour' | 'spa';

interface CategoryContent {
  id: AtelierCategory;
  name: string;
  icon: string;
  tagline: string;
  headlineWord: string;
  description: string;
  popularServices: string[];
  slotsAvailableToday: number;
  featuredShop: {
    name: string;
    image: string;
    location: string;
    rating: string;
    reviews: string;
    highlightBadge: string;
    priceStarting: string;
  };
}

const CATEGORY_DATA: Record<AtelierCategory, CategoryContent> = {
  barber: {
    id: 'barber',
    name: "Master Barbers",
    icon: "💈",
    tagline: "ARCHITECTURAL GROOMING & PRECISION FADES",
    headlineWord: "BARBER CRAFT.",
    description: "Book elite barbers renowned for precision skin fades, hot-towel straight razor treatments, and sculpted beard rituals with zero waiting time.",
    popularServices: ["Precision Skin Fade", "Beard Sculpt & Steam", "Signature Haircut", "Head Massage"],
    slotsAvailableToday: 18,
    featuredShop: {
      name: "The Royal Barber Atelier",
      image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1200",
      location: "Mayfair & Bandra West",
      rating: "4.98",
      reviews: "1,240+ verified bookings",
      highlightBadge: "Master Craftsman On Duty",
      priceStarting: "₹499"
    }
  },
  parlour: {
    id: 'parlour',
    name: "Luxury Parlours",
    icon: "✨",
    tagline: "HAUTE ESTHÉTIQUE & COUTURE HAIR RITUALS",
    headlineWord: "BEAUTY SALON.",
    description: "Reserve bespoke appointments at top-tier parlours for French balayage, botanical hair rejuvenation, glass-skin facials, and bridal suites.",
    popularServices: ["Balayage Couture", "Keratin Glass Ritual", "Hydra-Glow Facial", "Bridal Artistry"],
    slotsAvailableToday: 24,
    featuredShop: {
      name: "Maison de Beauté Sanctuary",
      image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
      location: "Bespoke Suites · City Center",
      rating: "4.99",
      reviews: "2,180+ verified bookings",
      highlightBadge: "Top-Rated Beauty Sanctuary",
      priceStarting: "₹899"
    }
  },
  spa: {
    id: 'spa',
    name: "Wellness & Spa",
    icon: "🌿",
    tagline: "CELLULAR DETOX & THERAPEUTIC RITUALS",
    headlineWord: "SPA & WELLNESS.",
    description: "Experience serene body therapies, Ayurvedic scalp healing, restorative aromatic baths, and deep-tissue recovery in private treatment pods.",
    popularServices: ["Deep Tissue Recovery", "Ayurvedic Scalp Detox", "Aroma Hydrotherapy", "Swedish Rejuvenation"],
    slotsAvailableToday: 12,
    featuredShop: {
      name: "Aurum Zen Spa & Wellness",
      image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
      location: "Heritage Suites & Retreats",
      rating: "4.97",
      reviews: "890+ verified bookings",
      highlightBadge: "Certified Wellness Therapists",
      priceStarting: "₹1,299"
    }
  }
};

const Hero: React.FC = () => {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<AtelierCategory>('barber');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [selectedServiceQuick, setSelectedServiceQuick] = useState<string>('All Services');

  const activeData = CATEGORY_DATA[selectedCategory];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { getSettings } = await import('../services/logic_engine');
        const data = await getSettings();
        setSettings(data);
      } catch (err) {
        console.debug("Settings fetch deferred or failed.");
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('auth') === 'true' && !isLoggedIn) {
      setShowAuthModal(true);
      if (location.state?.from) {
        setPendingPath(location.state.from);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, isLoggedIn, navigate]);

  const handleAction = (path: string) => {
    if (isLoggedIn) {
      navigate(path);
    } else {
      setPendingPath(path);
      setShowAuthModal(true);
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-white py-10 sm:py-14 md:py-16 lg:py-20 border-b-2 border-black/10">
      {/* Background Architectural Canvas (Pure White with Crisp Geometric Accents) */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#0052FF_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.035]"
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/40 to-transparent"
      />

      {/* Main Grid Container (CSS selector matching div:nth-of-type(3)) */}
      <div className="relative max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-14">
        
        {/* =========================================================================
            LEFT COLUMN (CSS selector 1: div:nth-of-type(3) > div:nth-of-type(1))
            Pure White, Deep Black & Electric Blue Hyper-Modern Presentation
            ========================================================================= */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 flex flex-col gap-6 text-left items-start w-full z-10"
        >
          {/* Dynamic Category Mode Switcher (Barber / Parlour / Spa) */}
          <div className="inline-flex items-center p-1.5 bg-black rounded-2xl shadow-lg border border-black/20 gap-1.5 flex-wrap">
            {(['barber', 'parlour', 'spa'] as AtelierCategory[]).map((catKey) => {
              const item = CATEGORY_DATA[catKey];
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-100'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* Micro Index Header */}
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold tracking-widest uppercase text-blue-700">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span>{activeData.tagline}</span>
          </div>

          {/* Master Headline in Black & Electric Blue */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-black text-black tracking-tight leading-[1.05] uppercase">
            {settings?.heroTitle ? (
              settings.heroTitle
            ) : (
              <>
                DISCOVER THE FINEST <br />
                <span className="text-blue-600 underline decoration-blue-600/30 decoration-8 underline-offset-8">
                  {activeData.headlineWord}
                </span>{' '}
                ZERO APPOINTMENT WAIT.
              </>
            )}
          </h1>

          {/* Editorial Subtitle */}
          <p className="text-base sm:text-lg text-black/75 max-w-2xl leading-relaxed font-medium">
            {settings?.heroSubtitle || activeData.description}
          </p>

          {/* Interactive Fast-Booking Command Bar */}
          <div className="w-full max-w-xl bg-white rounded-2xl border-2 border-black p-2.5 shadow-[6px_6px_0px_0px_#000000] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-blue-50/60 rounded-xl border border-blue-200/60">
              <Search className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-700">Service Category</span>
                <select 
                  value={selectedServiceQuick}
                  onChange={(e) => setSelectedServiceQuick(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-black focus:outline-none cursor-pointer"
                >
                  <option value="All Services">All {activeData.name} Rituals</option>
                  {activeData.popularServices.map((serviceName) => (
                    <option key={serviceName} value={serviceName}>{serviceName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="hidden sm:flex flex-col justify-center px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/60">Live Availability</span>
              <span className="text-xs font-black text-black flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                {activeData.slotsAvailableToday} Slots Today
              </span>
            </div>

            <button
              onClick={() => handleAction('/customer/explore')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 shrink-0"
            >
              <span>Explore Slots</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Quick Tags Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-black uppercase tracking-wider">Top Booked:</span>
            {activeData.popularServices.map((service, index) => (
              <button
                key={service}
                onClick={() => handleAction('/customer/explore')}
                className="text-xs font-bold px-3 py-1 bg-white hover:bg-black hover:text-white text-black border border-black/30 rounded-lg transition-colors"
              >
                {service}
              </button>
            ))}
          </div>

          {/* Trust Ledger (Pure Blue & Black) */}
          <div className="pt-5 border-t-2 border-black/10 w-full flex flex-wrap items-center gap-y-2 gap-x-6 text-xs font-bold text-black">
            <div className="flex items-center gap-2 text-blue-700">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>100% Escrow Protection Vault</span>
            </div>
            <span aria-hidden="true" className="text-black/30">|</span>
            <div className="flex items-center gap-2 text-black">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>5-Minute Instant Hold Guarantee</span>
            </div>
            <span aria-hidden="true" className="text-black/30">|</span>
            <div className="flex items-center gap-1 text-black">
              <Star className="w-4 h-4 fill-blue-600 text-blue-600" />
              <span className="font-black text-blue-600">4.98</span>
              <span>(18,000+ Reviews)</span>
            </div>
          </div>
        </motion.div>

        {/* =========================================================================
            RIGHT COLUMN (CSS selector 2: div:nth-of-type(3) > div:nth-of-type(2))
            Avant-Garde High-Impact Interactive Atelier Card
            ========================================================================= */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 relative flex flex-col items-center lg:items-end w-full"
        >
          {/* Main Visual Showcase with Bold Neo-Brutalist Frame & Electric Blue Shadow */}
          <div className="relative w-full max-w-[460px] bg-white rounded-3xl border-3 border-black p-3 shadow-[12px_12px_0px_0px_#0052FF] transition-all duration-300 hover:shadow-[16px_16px_0px_0px_#000000]">
            
            {/* Top Bar of the Atelier Card */}
            <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black/10 mb-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 border border-black/30" />
                <span className="w-3 h-3 rounded-full bg-amber-400 border border-black/30" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-black/30" />
                <span className="text-xs font-mono font-bold text-black ml-2 uppercase tracking-wide">
                  BB VERIFIED ATELIER
                </span>
              </div>
              <span className="text-[11px] font-black uppercase text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-300">
                LIVE NOW
              </span>
            </div>

            {/* Dynamic Photographic Canvas */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-black bg-black">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeData.featuredShop.name}
                  src={activeData.featuredShop.image}
                  alt={activeData.featuredShop.name}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.6 }}
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>

              {/* High-Contrast Badges Floating Over Image */}
              <div className="absolute top-3 left-3 bg-black text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border border-white/20 shadow-lg">
                {activeData.featuredShop.highlightBadge}
              </div>

              <div className="absolute top-3 right-3 bg-white text-black px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border-2 border-black shadow-md flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-blue-600 text-blue-600" />
                <span>{activeData.featuredShop.rating}</span>
              </div>

              <div className="absolute bottom-3 left-3 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-wide shadow-lg flex items-center gap-1.5 border border-white/30">
                <Clock className="w-3.5 h-3.5" />
                <span>Avg. Service Time: 35 mins</span>
              </div>
            </div>

            {/* Atelier Information Deck */}
            <div className="p-4 flex flex-col gap-2.5 text-left">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black text-black tracking-tight uppercase">
                    {activeData.featuredShop.name}
                  </h3>
                  <p className="text-xs text-black/60 font-bold flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    {activeData.featuredShop.location}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-black/50 uppercase block">Starting from</span>
                  <span className="text-lg font-black text-blue-600">{activeData.featuredShop.priceStarting}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50/80 rounded-xl border border-blue-200 mt-1">
                <div>
                  <span className="text-[11px] font-extrabold text-blue-900 block">Verified Escrow Hold</span>
                  <span className="text-[10px] text-blue-700 font-medium">Auto-refund if slot rejected</span>
                </div>
                <span className="text-xs font-black text-white bg-blue-600 px-2.5 py-1 rounded-lg shadow-sm">
                  100% SAFE
                </span>
              </div>

              {/* Action Buttons Inside Card */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => handleAction('/customer/explore')}
                  className="bg-black hover:bg-zinc-800 text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider text-center transition-colors border-2 border-black flex items-center justify-center gap-1.5"
                >
                  <span>Book Slot</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleAction('/customer-dashboard')}
                  className="bg-white hover:bg-gray-100 text-black font-black text-xs py-3 rounded-xl uppercase tracking-wider text-center transition-colors border-2 border-black"
                >
                  My Appointments
                </button>
              </div>
            </div>

          </div>

          {/* Quick Category Indicator Pills Beneath */}
          <div className="w-full max-w-[460px] mt-4 flex items-center justify-between px-2 text-xs font-mono font-bold text-black">
            <span className="text-blue-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              CATEGORY: {selectedCategory.toUpperCase()}
            </span>
            <span className="text-black/60">
              SWITCH MODES ABOVE ↑
            </span>
          </div>

        </motion.div>

      </div>

      <CustomerAuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          if (pendingPath) navigate(pendingPath);
        }}
      />
    </section>
  );
};

export default Hero;
