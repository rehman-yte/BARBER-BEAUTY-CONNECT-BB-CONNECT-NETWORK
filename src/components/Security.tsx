
import React from 'react';

const Security: React.FC = () => {
  return (
    <section className="py-[5rem] bg-white">
      <div className="max-w-[1440px] mx-auto px-[5%]">
        <div className="bg-gray-50 rounded-[3rem] p-8 md:p-16 border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-12 md:gap-24">
          
          {/* Left Side: Icons (Narrow Column) */}
          <div className="flex flex-row md:flex-col gap-8 md:gap-12 shrink-0">
            <div className="flex flex-col items-center md:items-start gap-3 group">
              <div className="w-14 h-14 bg-bbBlue/10 rounded-xl flex items-center justify-center text-bbBlue shadow-sm border border-bbBlue/5 group-hover:bg-bbBlue group-hover:text-white transition-all duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>
              <span className="text-[0.625rem] font-bold text-charcoal uppercase tracking-widest">Verified</span>
            </div>

            <div className="flex flex-col items-center md:items-start gap-3 group">
              <div className="w-14 h-14 bg-bbBlue/10 rounded-xl flex items-center justify-center text-bbBlue shadow-sm border border-bbBlue/5 group-hover:bg-bbBlue group-hover:text-white transition-all duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <span className="text-[0.625rem] font-bold text-charcoal uppercase tracking-widest">Encrypted</span>
            </div>

            <div className="flex flex-col items-center md:items-start gap-3 group">
              <div className="w-14 h-14 bg-bbBlue/10 rounded-xl flex items-center justify-center text-bbBlue shadow-sm border border-bbBlue/5 group-hover:bg-bbBlue group-hover:text-white transition-all duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <span className="text-[0.625rem] font-bold text-charcoal uppercase tracking-widest">Instant</span>
            </div>
          </div>

          {/* Right Side: Text (Main Content) */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-bbBlue-deep uppercase tracking-tight mb-6 leading-tight">
              Advanced <br className="hidden md:block" /> Protection Hub
            </h2>
            <p className="text-[1rem] md:text-[1.125rem] text-gray-500 font-medium leading-relaxed max-w-2xl">
              Encrypted data, verified professionals, and secure transactions—at the core of our platform. We ensure every interaction is protected by industry-leading security protocols.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Security;
