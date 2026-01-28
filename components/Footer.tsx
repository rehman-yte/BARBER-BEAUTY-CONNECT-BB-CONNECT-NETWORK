
import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-charcoal text-gray-400 pt-20 pb-10 px-6 md:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 text-center md:text-left">
        
        {/* About Column */}
        <div className="flex flex-col gap-6">
          <Link to="/" className="flex flex-col items-center md:items-start leading-none group">
            <span className="text-xl font-serif font-bold text-white tracking-tight group-hover:text-bbBlue transition-colors">
              BB CONNECT
            </span>
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-1 group-hover:text-bbBlue transition-colors">
              OFFICIAL NETWORK
            </span>
          </Link>
          <p className="text-xs leading-relaxed font-medium">
            The premium digital infrastructure for the global grooming and beauty industry. Providing quality, security, and elite connection.
          </p>
        </div>

        {/* Socials Column */}
        <div className="flex flex-col gap-6">
          <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">Follow Excellence</h4>
          <div className="flex justify-center md:justify-start gap-8">
             <a href="#" className="text-xs font-bold hover:text-bbBlue transition-colors uppercase tracking-widest">Instagram</a>
             <a href="#" className="text-xs font-bold hover:text-bbBlue transition-colors uppercase tracking-widest">Twitter</a>
             <a href="#" className="text-xs font-bold hover:text-bbBlue transition-colors uppercase tracking-widest">LinkedIn</a>
          </div>
        </div>

        {/* Contact Column */}
        <div className="flex flex-col gap-6">
          <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">Reach Out</h4>
          <div className="flex flex-col gap-3 text-xs font-medium">
            <a href="mailto:contact@bbconnect.network" className="hover:text-bbBlue transition-colors">contact@bbconnect.network</a>
            <span>+1 (888) CONNECT-NETWORK</span>
            <span>London, United Kingdom</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em]">
        <span>© {new Date().getFullYear()} BB CONNECT NETWORK. ALL RIGHTS RESERVED.</span>
        <div className="flex gap-8">
          <a href="#" className="hover:text-bbBlue transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-bbBlue transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-bbBlue transition-colors">Cookies</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
