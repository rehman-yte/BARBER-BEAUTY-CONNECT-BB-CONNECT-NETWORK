
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Clock, Wallet, CheckCircle2, UserCheck, Star, HelpCircle, ArrowLeft } from 'lucide-react';

const TermsAndConditions: React.FC = () => {
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
            <Shield size={12} className="text-bbBlue" />
            <span className="text-[9px] font-black text-bbBlue uppercase tracking-[0.25em]">BB CONNECT NETWORK • LEGAL DIRECTIVE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-charcoal tracking-tight">
            Terms & Conditions of Service
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-2">
            Last Updated: August 2026 • Effective for all Customers, Partner Salons & Service Providers
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
                Platform Architecture & Marketplace Nature
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              BB Connect Network (&quot;BB Connect&quot;, &quot;Platform&quot;, &quot;We&quot;, &quot;Us&quot;) provides a state-of-the-art digital infrastructure connecting customers seeking premium grooming and beauty services with independent verified Barbers, Hair Stylists, and Beauty Parlours (&quot;Partners&quot;).
            </p>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              By accessing our web applications, registering an account, booking appointments, or onboarding as a service provider, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must discontinue platform use immediately.
            </p>
          </section>

          {/* Section 2: 5-Minute Hold & Auto-Refund */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border-2 border-bbBlue/15 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-600/20">
                <Clock size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                5-Minute Escrow & Guaranteed Auto-Refund Protocol
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-4">
              To eliminate financial risk and avoid service delays, BB Connect operates an automated live booking verification system:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-bbBlue mb-1">Step 1 • Slot Hold</p>
                <p className="text-xs text-gray-700 font-medium">Payment is held securely in platform escrow for exactly 5 minutes upon checkout.</p>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-bbBlue mb-1">Step 2 • Partner Action</p>
                <p className="text-xs text-gray-700 font-medium">The selected Partner must accept or decline the slot request within the 5-minute countdown.</p>
              </div>
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 mb-1">Step 3 • Auto-Refund</p>
                <p className="text-xs text-emerald-900 font-medium">If declined or timed out, 100% of the funds are instantly credited to your BB Connect Wallet.</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              • All refunds are processed atomically with zero processing cuts or platform penalties on timeout/rejection events.
            </p>
          </section>

          {/* Section 3: BB Connect Wallet */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                <Wallet size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                BB Connect Customer Wallet & Payment Rules
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              The BB Connect Wallet is an internal store credit system created to provide seamless, one-click re-booking when appointments are rescheduled or refunded:
            </p>
            <ul className="space-y-2.5 text-xs text-gray-700 font-medium pl-1">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Instant 1-Click Rebooking:</strong> When your wallet balance is greater than or equal to the total service price, you can book instantly without routing through payment gateways.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>No Partial Split Payments:</strong> To maintain ledger clarity, split transactions (partial wallet + gateway) are not permitted. If balance is less than required, customers proceed via online payment gateways.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Immutable Transaction Ledger:</strong> Every wallet credit and debit generates an immutable record accessible from your Customer Dashboard.</span>
              </li>
            </ul>
          </section>

          {/* Section 4: Partner Vetting & Service Standards */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-charcoal flex items-center justify-center font-bold text-sm">
                <UserCheck size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                Partner Standards, KYC Vetting & Pricing Integrity
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              Every shop listed on the BB Connect Network undergoes mandatory administrative review:
            </p>
            <ul className="space-y-2 text-xs text-gray-700 font-medium pl-4 list-disc">
              <li>Partners must accurately maintain their live shop status (Online vs Offline) and available chair capacities.</li>
              <li>Service menus, prices, and package details displayed on the platform are legally binding and cannot be altered after a slot has been accepted.</li>
              <li>Partners agree to maintain sanitary, professional, and safe premises for all visiting customers.</li>
            </ul>
          </section>

          {/* Section 5: Ratings & Genuine Customer Feedback */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                <Star size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                Verified Reviews & Anti-Spam Rating Policy
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              To guarantee absolute honesty across our network:
            </p>
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              Reviews and star ratings can <strong>only</strong> be submitted for appointments marked as <strong>COMPLETED</strong> by the verified service provider. Unfulfilled, cancelled, or fictitious bookings cannot generate ratings, ensuring zero artificial score manipulation.
            </p>
          </section>

          {/* Section 6: Customer Responsibilities & Punctuality */}
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-charcoal flex items-center justify-center font-bold text-sm">
                <HelpCircle size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal">
                Customer Punctuality & Support Resolution
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">
              Customers are expected to arrive at the partner salon at least 5 minutes prior to their confirmed time slot. Repeated no-shows without prior cancellation may result in booking restrictions.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-gray-500">
              <span>Support Inquiries: <strong>contact@bbconnect.network</strong></span>
              <span>Direct Phone Support: <strong>+91 8273865308</strong></span>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default TermsAndConditions;
