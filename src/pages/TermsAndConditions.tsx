
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const TermsAndConditions: React.FC = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-bbBlue-deep mb-4 uppercase tracking-tight">Terms & Conditions</h1>
          <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.4em]">Operational Guidelines</p>
        </header>

        <div className="prose prose-sm prose-slate max-w-none text-gray-600 space-y-8 font-medium leading-relaxed">
          <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
            <h2 className="text-xl font-serif font-bold text-bbBlue mb-4 uppercase">1. Payment Escrow Logic</h2>
            <p>
              To ensure zero financial risk for our customers, the BB Connect Network employs a <strong>Secure Escrow System</strong>. Upon payment initiation:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Funds are held securely by the platform for exactly 5 minutes.</li>
              <li>The Partner must acknowledge and accept the slot request within this timeframe.</li>
              <li>If no response is received, the system triggers an <strong>Auto-Refund Protocol</strong> immediately.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">2. Permanent Transaction Logging</h2>
            <p>
              For security and transparency, every initiated booking creates a permanent cryptographic record. Once a slot is booked or a payment is held, the record becomes a permanent part of your <strong>Personal Dashboard</strong>. These entries cannot be deleted, serving as a verifiable audit trail for both customers and partners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">3. Partner Participation</h2>
            <p>
              Partner signup is a one-time verification process. Once admitted to the BB Connect Network, partners maintain their elite status. While the partnership is permanent, members have the flexibility to update their service menus, pricing, and shop imagery at any time through their professional dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">4. User Responsibilities</h2>
            <p>
              Users are responsible for maintaining the confidentiality of their Login ID. Any unauthorized access due to user negligence is the responsibility of the member.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default TermsAndConditions;
