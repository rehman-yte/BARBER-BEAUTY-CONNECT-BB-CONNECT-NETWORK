
import React from 'react';

const Security: React.FC = () => {
  return (
    <section className="py-20 px-6 md:px-12 bg-white">
      <div className="max-w-7xl mx-auto bg-gray-50 rounded-[2.5rem] p-10 md:p-16 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex flex-col gap-2 max-w-md text-center md:text-left">
          <h2 className="text-2xl font-serif font-bold text-bbBlue-deep uppercase tracking-tight">Advanced Protection Hub</h2>
          <p className="text-sm text-gray-500 font-medium">Encrypted data, verified professionals, and secure transactions—at the core of our platform.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-10 md:gap-16">
          <div className="flex flex-col items-center gap-4 group">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-bbBlue shadow-sm border border-gray-100 group-hover:text-bbBlue-deep transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest">Verified</span>
          </div>

          <div className="flex flex-col items-center gap-4 group">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-bbBlue shadow-sm border border-gray-100 group-hover:text-bbBlue-deep transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest">Encrypted</span>
          </div>

          <div className="flex flex-col items-center gap-4 group">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-bbBlue shadow-sm border border-gray-100 group-hover:text-bbBlue-deep transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest">Instant</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Security;
