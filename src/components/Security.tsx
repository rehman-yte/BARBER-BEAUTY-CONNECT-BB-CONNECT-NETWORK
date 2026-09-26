
import React from 'react';
import { ShieldCheck, Lock, Zap, CheckCircle2 } from 'lucide-react';

const Security: React.FC = () => {
  return (
    <section className="py-16 md:py-20 bg-white border-b-2 border-black/10">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="bg-white rounded-3xl p-8 md:p-14 border-3 border-black shadow-[8px_8px_0px_0px_#0052FF] flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-16">
          
          {/* Left Side: Icons Strip */}
          <div className="flex flex-row md:flex-col gap-6 md:gap-8 shrink-0">
            <div className="flex flex-col items-center md:items-start gap-2 group">
              <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_#0052FF] group-hover:bg-blue-600 transition-colors">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-mono font-black text-black uppercase tracking-wider">Verified</span>
            </div>

            <div className="flex flex-col items-center md:items-start gap-2 group">
              <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_#0052FF] group-hover:bg-blue-600 transition-colors">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-mono font-black text-black uppercase tracking-wider">Encrypted</span>
            </div>

            <div className="flex flex-col items-center md:items-start gap-2 group">
              <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_#0052FF] group-hover:bg-blue-600 transition-colors">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-mono font-black text-black uppercase tracking-wider">Instant Hold</span>
            </div>
          </div>

          {/* Right Side: Text (Main Content) */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-mono font-bold tracking-widest text-blue-600 uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>PLATFORM INTEGRITY & ESCROW</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight mb-4 leading-tight">
              ADVANCED <br className="hidden md:block" />
              <span className="text-blue-600">PROTECTION HUB</span>
            </h2>
            <p className="text-base md:text-lg text-black/80 font-medium leading-relaxed max-w-2xl mb-6">
              Zero risk, 100% transparent. When you book a slot, funds are held securely in the escrow vault. If a salon cannot fulfill your slot within 5 minutes, an instantaneous automated refund is issued back to your wallet.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-bold text-black">
              <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-900">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>256-Bit Bank Grade Encryption</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-900">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Zero Deductions on Cancel</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Security;
