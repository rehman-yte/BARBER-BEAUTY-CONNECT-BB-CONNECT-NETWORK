
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicy: React.FC = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-bbBlue-deep mb-4 uppercase tracking-tight">Privacy Policy</h1>
          <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.4em]">Data Integrity Protocols</p>
        </header>

        <div className="prose prose-sm prose-slate max-w-none text-gray-600 space-y-8 font-medium leading-relaxed">
          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">1. Secure Identity Architecture</h2>
            <p>
              At BB Connect Network, we prioritize the absolute security of our members. All <strong>User Data</strong>, including sensitive contact information, and <strong>Partner IDs</strong> are processed through high-level AES-256 encryption. This ensures that your professional identity remains protected within our elite ecosystem.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">2. Information Collection</h2>
            <p>
              We collect minimal data required to maintain platform excellence. This includes your name, verified mobile number, and professional credentials. Partner information is subjected to a one-time verification process to ensure the integrity of our network.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">3. Data Usage</h2>
            <p>
              Your data is used solely for the facilitation of secure grooming and beauty service bookings. We do not sell, trade, or share your encrypted credentials with external third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">4. Rights and Access</h2>
            <p>
              Members have the right to request access to their platform activity logs. However, due to the <strong>Permanent Record Protocol</strong>, booking histories linked to verified transactions cannot be deleted to ensure full platform transparency and accountability.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicy;
