
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const CookiesPolicy: React.FC = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-bbBlue-deep mb-4 uppercase tracking-tight">Cookies Policy</h1>
          <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.4em]">Member Experience Optimization</p>
        </header>

        <div className="prose prose-sm prose-slate max-w-none text-gray-600 space-y-8 font-medium leading-relaxed">
          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">1. Essential Operations</h2>
            <p>
              BB Connect Network uses cookies primarily for essential session management. These "Functional Cookies" keep you logged into the portal as you navigate between the Explore page, Shop Details, and your Personal Dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">2. User Preference Memory</h2>
            <p>
              We utilize cookies to remember your platform preferences, such as your preferred <strong>Service Type</strong> (Barber or Beauty Parlour). This ensures a tailored and efficient browsing experience every time you return to the network.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">3. Third-Party Restrictions</h2>
            <p>
              We do not use tracking cookies for cross-site behavioral advertising. Our platform is a closed ecosystem focused strictly on professional connection and secure transactions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-bold text-charcoal mb-4 uppercase">4. Management</h2>
            <p>
              You can manage your cookie preferences through your browser settings. Note that disabling essential session cookies will prevent the secure booking engine from functioning correctly.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default CookiesPolicy;
