
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Lock, EyeOff, Database, ShieldCheck, UserCheck, BellRing, ArrowLeft } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
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
            <Lock size={12} className="text-bbBlue" />
            <span className="text-[9px] font-black text-bbBlue uppercase tracking-[0.25em]">BB CONNECT NETWORK • PRIVACY SHIELD</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-charcoal tracking-tight">
            Privacy Policy & Data Security
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-2">
            Last Updated: August 2026 • Governing Customer & Partner Information Across BB Connect
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
                Data Collection & Legitimate Scope
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              BB Connect Network collects only the minimum necessary information required to facilitate authentic salon service discovery, secure appointments, payment escrow, and customer wallet ledgers:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal mb-1.5 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-bbBlue" /> For Customers
                </p>
                <ul className="text-xs text-gray-600 space-y-1 pl-4 list-disc font-medium">
                  <li>Full name & contact phone number</li>
                  <li>Authentication credentials (Firebase Auth token)</li>
                  <li>Booking history, appointment timings & service notes</li>
                  <li>BB Connect Wallet balances & transaction ledger logs</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-bbBlue" /> For Partner Salons
                </p>
                <ul className="text-xs text-gray-600 space-y-1 pl-4 list-disc font-medium">
                  <li>Salon name, geographic coordinates & physical address</li>
                  <li>Owner contact details & KYC identification</li>
                  <li>Service catalogs, customized pricing & chair capacities</li>
                  <li>Bank/UPI payout details for revenue settlement</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                <EyeOff size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                Strict Zero-Ad & Non-Sale Policy
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              We uphold an uncompromised privacy standard:
            </p>
            <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <strong>We NEVER sell, rent, or trade customer contact numbers, booking history, or partner financial records to third-party ad brokers or data aggregators.</strong> Your data is used exclusively to operate your grooming appointments, communicate booking alerts, and maintain platform integrity.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-bbBlue flex items-center justify-center font-bold text-sm">
                <Database size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                Cloud Encryption & Transaction Security
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              All interactions across BB Connect are protected by enterprise-grade cryptographic standards:
            </p>
            <ul className="space-y-2 text-xs text-gray-700 font-medium pl-4 list-disc">
              <li><strong>In-Transit Encryption:</strong> High-security TLS 1.3 encryption across all client-server communications.</li>
              <li><strong>At-Rest Security:</strong> Google Cloud Firestore database infrastructure secured by role-based security rules (RBAC).</li>
              <li><strong>Payment Tokenization:</strong> We do not store raw card numbers or CVVs on our servers; payments are processed via RBI-compliant tokenized payment gateways.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-charcoal flex items-center justify-center font-bold text-sm">
                <BellRing size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                Customer Rights & Data Management
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              Customers and Partners have complete visibility into their personal profile:
            </p>
            <ul className="space-y-2 text-xs text-gray-700 font-medium pl-4 list-disc">
              <li>View and export your complete booking history and wallet ledger directly from your dashboard.</li>
              <li>Dismiss or postpone rating prompts at any time.</li>
              <li>Request profile updates or account deactivation by emailing our support desk.</li>
            </ul>
            <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 font-medium">
              Data Privacy Officer: <strong>contact@bbconnect.network</strong> • Official Address: Uttar Pradesh, India
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicy;
