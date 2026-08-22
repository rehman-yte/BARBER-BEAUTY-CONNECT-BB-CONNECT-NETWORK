
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Cookie, KeyRound, MapPin, Sliders, ArrowLeft, ShieldAlert } from 'lucide-react';

const CookiesPolicy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pt-28 sm:pt-36 pb-24 px-4 sm:px-6 md:px-12 bg-gray-50/50 min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto"
      >
        {/* Navigation Breadcrumb */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-bbBlue transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/80 mb-3">
            <Cookie size={12} className="text-bbBlue" />
            <span className="text-[9px] font-black text-bbBlue uppercase tracking-[0.25em]">BB CONNECT NETWORK • COOKIE DIRECTIVE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-charcoal tracking-tight">
            Cookies & Local Storage Policy
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-2">
            Last Updated: August 2026 • Clarifying Functional Data Storage & Browser Tokens
          </p>
        </header>

        <div className="space-y-8 font-sans">
          {/* Section 1 */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-bbBlue flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                How We Use Cookies & Local Storage
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              BB Connect uses functional cookies and browser LocalStorage strictly for core operational integrity, authentic session maintenance, and responsive user interfaces. We do not employ third-party cross-site trackers or advertising cookies.
            </p>
          </section>

          {/* Section 2: Functional Uses */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                <Sliders size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                Functional Storage Purposes on BB Connect
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound size={16} className="text-bbBlue" />
                  <p className="text-xs font-bold uppercase tracking-wider text-charcoal">Authentication</p>
                </div>
                <p className="text-xs text-gray-600 font-medium">
                  Maintains secure login sessions for Customers, Partners, and Admins across page refreshes.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-bbBlue" />
                  <p className="text-xs font-bold uppercase tracking-wider text-charcoal">Discovery Filters</p>
                </div>
                <p className="text-xs text-gray-600 font-medium">
                  Remembers your selected category (Barber vs. Beauty Parlour) and localized search preferences.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Cookie size={16} className="text-bbBlue" />
                  <p className="text-xs font-bold uppercase tracking-wider text-charcoal">Rating Dismissal</p>
                </div>
                <p className="text-xs text-gray-600 font-medium">
                  Stores review modal dismissal flags to prevent repetitive feedback popups upon dashboard reload.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Third Party Restrictions */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                <ShieldAlert size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                Strict Absence of Third-Party Advertising Trackers
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              BB Connect does not load third-party ad networks, social pixel beacons, or tracking spyware. Your grooming preferences and financial transactions remain confidential within the secure BB Connect ecosystem.
            </p>
          </section>

          {/* Section 4: Managing Cookies */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-charcoal flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                Browser Controls
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              You can adjust or clear your cookies anytime via your browser settings. Please note that clearing functional session storage will log you out of your active dashboard session and reset your unsubmitted cart items.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 font-medium">
              Questions regarding functional cookies? Contact <strong>contact@bbconnect.network</strong>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default CookiesPolicy;
