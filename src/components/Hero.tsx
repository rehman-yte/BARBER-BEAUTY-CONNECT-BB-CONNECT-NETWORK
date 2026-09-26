
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CustomerAuthModal from './CustomerAuthModal';
import { 
  Star, ShieldCheck, ArrowRight, Clock, 
  MapPin, ChevronRight, ChevronLeft, Zap, Search
} from 'lucide-react';

type AtelierCategory = 'barber' | 'parlour' | 'spa';

interface SlideImage {
  id: string;
  url: string;
  category: AtelierCategory;
  title: string;
  tagline: string;
  badge: string;
  price: string;
  rating: string;
  location: string;
}

const HERO_SLIDES: SlideImage[] = [
  {
    id: 'slide_1',
    url: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1200",
    category: 'barber',
    title: "Master Fade & Razor Sculpting",
    tagline: "Precision beard architecture & hot towel ritual",
    badge: "VERIFIED BARBER ATELIER",
    price: "From ₹499",
    rating: "4.98",
    location: "Mayfair & Bandra West"
  },
  {
    id: 'slide_2',
    url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
    category: 'parlour',
    title: "Haute Esthétique Hair Rituals",
    tagline: "French balayage, keratin glass & botanical scalp therapy",
    badge: "TOP-RATED BEAUTY SANCTUARY",
    price: "From ₹899",
    rating: "4.99",
    location: "Bespoke Suites · City Center"
  },
  {
    id: 'slide_3',
    url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1200",
    category: 'barber',
    title: "Royal Straight-Razor Shave",
    tagline: "Artisanal grooming club with traditional sandalwood balm",
    badge: "ROYAL GROOMING CLUB",
    price: "From ₹399",
    rating: "4.96",
    location: "Private Member Chambers"
  },
  {
    id: 'slide_4',
    url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
    category: 'parlour',
    title: "Hydra-Glow Facial & Bridal Suite",
    tagline: "Cellular rejuvenation with organic floral extracts",
    badge: "HAUTE BEAUTY ATELIER",
    price: "From ₹1,199",
    rating: "4.98",
    location: "Heritage Suites"
  },
  {
    id: 'slide_5',
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
    category: 'spa',
    title: "Zen Deep-Tissue & Hydrotherapy",
    tagline: "Aromatic therapeutic healing in private treatment pods",
    badge: "WELLNESS SANCTUARY",
    price: "From ₹1,299",
    rating: "4.97",
    location: "Sanctuary Chambers"
  }
];

const CATEGORY_TAGLINES: Record<AtelierCategory, { headlineWord: string; tagline: string; services: string[] }> = {
  barber: {
    headlineWord: "BARBER CRAFT",
    tagline: "PRECISION FADES & ARTISANAL GROOMING",
    services: ["Skin Fade", "Beard Sculpt", "Hot Towel Shave", "Hair Ritual"]
  },
  parlour: {
    headlineWord: "BEAUTY SALON",
    tagline: "HAUTE ESTHÉTIQUE & BALAYAGE SUITES",
    services: ["French Balayage", "Hydra Facial", "Keratin Treatment", "Bridal Artistry"]
  },
  spa: {
    headlineWord: "SPA & WELLNESS",
    tagline: "CELLULAR DETOX & THERAPEUTIC RITUALS",
    services: ["Deep Tissue", "Scalp Detox", "Aroma Therapy", "Swedish Massage"]
  }
};

const Hero: React.FC = () => {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<AtelierCategory>('barber');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [selectedServiceQuick, setSelectedServiceQuick] = useState<string>('All Services');

  const catMeta = CATEGORY_TAGLINES[selectedCategory];

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

  // Continuous Auto-Slide Timer (every 4.5 seconds)
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handleAction = (path: string) => {
    if (isLoggedIn) {
      navigate(path);
    } else {
      setPendingPath(path);
      setShowAuthModal(true);
    }
  };

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const activeSlide = HERO_SLIDES[currentSlideIndex];

  return (
    <section className="relative w-full overflow-hidden bg-white py-10 sm:py-14 md:py-16 lg:py-20 border-b-2 border-black/10">
      {/* Background Architectural Grid Pattern */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#0052FF_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.035]"
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/40 to-transparent"
      />

      {/* Main Grid: Left Side Text Area + Right Side Invisible Sliding Images Container */}
      <div className="relative max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 items-start gap-10 lg:gap-14">
        
        {/* =========================================================================
            LEFT COLUMN (CSS selector 2: div:nth-of-type(3) > div:nth-of-type(1))
            Texts Area: Headline, Category Switcher, Search Command Bar, Trust
            ========================================================================= */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 flex flex-col gap-6 text-left items-start w-full z-10"
        >
          {/* Category Switcher */}
          <div className="inline-flex items-center p-1.5 bg-black rounded-2xl shadow-lg border border-black/20 gap-1.5 flex-wrap">
            {[
              { id: 'barber', name: 'Master Barbers', icon: '💈' },
              { id: 'parlour', name: 'Luxury Parlours', icon: '✨' },
              { id: 'spa', name: 'Wellness & Spa', icon: '🌿' }
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id as AtelierCategory);
                    const matchingIdx = HERO_SLIDES.findIndex(s => s.category === cat.id);
                    if (matchingIdx !== -1) setCurrentSlideIndex(matchingIdx);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Micro Index Header */}
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold tracking-widest uppercase text-blue-700">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span>{catMeta.tagline}</span>
          </div>

          {/* Master Headline in Black & Electric Blue */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-black text-black tracking-tight leading-[1.05] uppercase">
            {settings?.heroTitle ? (
              settings.heroTitle
            ) : (
              <>
                DISCOVER THE FINEST <br />
                <span className="text-blue-600 underline decoration-blue-600/30 decoration-8 underline-offset-8">
                  {catMeta.headlineWord}.
                </span>{' '}
                ZERO APPOINTMENT WAIT.
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-black/75 max-w-2xl leading-relaxed font-medium">
            {settings?.heroSubtitle || 
              "Reserve your bespoke appointment at verified master barber ateliers and premier beauty sanctuaries. Protected by our 5-minute escrow hold and private salon concierge."
            }
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
                  <option value="All Services">All Available Rituals</option>
                  {catMeta.services.map((serviceName) => (
                    <option key={serviceName} value={serviceName}>{serviceName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="hidden sm:flex flex-col justify-center px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/60">Live Availability</span>
              <span className="text-xs font-black text-black flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Slots Today
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
            {catMeta.services.map((service) => (
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
            RIGHT COLUMN (CSS selector 1: div:nth-of-type(3) > div:nth-of-type(2))
            Invisible Container with Sliding Images Right Beside the Text Area
            Lifted & shifted to the top right.
            ========================================================================= */}
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="lg:col-span-5 relative flex flex-col items-center lg:items-end w-full self-start lg:pt-1 bg-transparent border-0 shadow-none p-0"
        >
          {/* Sliding Image Canvas (Directly floating, no outer card box) */}
          <div className="relative w-full max-w-[500px] aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl bg-black border-2 border-black group select-none">
            
            <AnimatePresence mode="wait">
              <motion.img
                key={activeSlide.id}
                src={activeSlide.url}
                alt={activeSlide.title}
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>

            {/* Subtle Gradient Overlays for High-Contrast Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30 pointer-events-none" />

            {/* Top Floating Badges Over Image */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
              <span className="bg-black/85 text-white border border-white/20 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-md">
                {activeSlide.badge}
              </span>
              <span className="bg-blue-600 text-white border border-white/30 px-3 py-1 rounded-xl text-xs font-black tracking-wide shadow-md flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-white text-white" />
                <span>{activeSlide.rating}</span>
              </span>
            </div>

            {/* Bottom Floating Information Overlay */}
            <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 z-20 text-white flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  {activeSlide.title}
                </h3>
                <span className="text-sm font-black text-blue-400 bg-black/60 px-2.5 py-0.5 rounded-lg border border-white/10 shrink-0">
                  {activeSlide.price}
                </span>
              </div>

              <p className="text-xs text-white/80 font-medium line-clamp-1">
                {activeSlide.tagline}
              </p>

              <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/20 text-xs">
                <span className="flex items-center gap-1.5 text-white/80 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {activeSlide.location}
                </span>

                <button
                  onClick={() => handleAction('/customer/explore')}
                  className="inline-flex items-center gap-1 text-blue-300 hover:text-white font-black uppercase tracking-wider transition-colors"
                >
                  <span>Book Now</span>
                  <ChevronRight className="w-4 h-4 text-blue-400" />
                </button>
              </div>
            </div>

            {/* Manual Slide Navigation Arrows On Image Hover */}
            <button
              onClick={prevSlide}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-30 border border-white/20 shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-30 border border-white/20 shadow-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Minimalist Slider Pagination Dots Under Image */}
          <div className="w-full max-w-[500px] mt-3 flex items-center justify-center px-1">
            <div className="flex items-center gap-1.5">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  aria-label={`Jump to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentSlideIndex 
                      ? 'w-8 bg-blue-600 shadow-sm' 
                      : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
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
