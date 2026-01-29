
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
          <div className="flex justify-center md:justify-start gap-8 items-center">
             {/* Instagram - Clickable */}
             <a 
               href="https://www.instagram.com/barberbeautyconnect?igsh=MTZ4djd6enkxd2Vhdg==" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-white hover:text-bbBlue transition-all transform hover:scale-110"
               aria-label="Instagram"
             >
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
               </svg>
             </a>

             {/* Twitter - Non-clickable */}
             <span className="text-gray-600 opacity-50 cursor-default pointer-events-none" aria-label="Twitter">
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
               </svg>
             </span>

             {/* LinkedIn - Non-clickable */}
             <span className="text-gray-600 opacity-50 cursor-default pointer-events-none" aria-label="LinkedIn">
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.238 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
               </svg>
             </span>
          </div>
        </div>

        {/* Contact Column */}
        <div className="flex flex-col gap-6">
          <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">Reach Out</h4>
          <div className="flex flex-col gap-3 text-xs font-medium">
            <a href="mailto:contact@bbconnect.network" className="hover:text-bbBlue transition-colors">contact@bbconnect.network</a>
            <a href="tel:+918273865308" className="hover:text-bbBlue transition-colors">+91 8273865308</a>
            <span>Uttar Pradesh, India</span>
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
