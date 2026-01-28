
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomerDashboard: React.FC = () => {
  const [activeFolder, setActiveFolder] = useState<'Approved' | 'Rejected' | 'Failed'>('Approved');

  const slots = {
    Approved: [
      { id: 101, shop: "The Gentleman's Cut", service: "Executive Haircut", date: "Oct 24, 2023", time: "14:30", price: 45 },
      { id: 102, shop: "Velvet Bloom Salon", service: "Artistic Coloring", date: "Oct 26, 2023", time: "11:00", price: 75 }
    ],
    Rejected: [
      { id: 201, shop: "Royal Shave Lounge", service: "Royal Shave", date: "Oct 22, 2023", time: "09:00", reason: "Technician Unavailable" }
    ],
    Failed: [
      { id: 301, shop: "Elite Esthetics", service: "Spa Day", date: "Oct 23, 2023", time: "16:00", error: "Bank Server Timeout" }
    ]
  };

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-3 uppercase tracking-tight">Personal Dashboard</h1>
            <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.4em]">Official BB Connect Member Profile</p>
          </div>
          <div className="flex items-center gap-6 bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100">
             <div className="flex flex-col items-end border-r border-gray-200 pr-6">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Network Status</span>
                <span className="text-[11px] font-bold text-green-500 uppercase tracking-tight">Active Connection</span>
             </div>
             <div className="flex flex-col items-start">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Global ID</span>
                <span className="text-[11px] font-bold text-bbBlue uppercase tracking-tight">Verified Member</span>
             </div>
          </div>
        </header>

        {/* Folder Tabs */}
        <div className="flex border-b border-gray-100 mb-12 overflow-x-auto scrollbar-hide">
          {[
            { key: 'Approved', label: 'Approved Slots', count: slots.Approved.length, color: 'text-bbBlue' },
            { key: 'Rejected', label: 'Rejected Slots', count: slots.Rejected.length, color: 'text-red-500' },
            { key: 'Failed', label: 'Payment Failures', count: slots.Failed.length, color: 'text-orange-500' }
          ].map((folder) => (
            <button
              key={folder.key}
              onClick={() => setActiveFolder(folder.key as any)}
              className={`relative px-10 py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap flex items-center gap-3 ${
                activeFolder === folder.key ? folder.color : 'text-gray-300 hover:text-charcoal'
              }`}
            >
              {folder.label}
              <span className={`text-[8px] px-1.5 py-0.5 rounded-md ${activeFolder === folder.key ? 'bg-current text-white' : 'bg-gray-100 text-gray-400'}`}>
                {folder.count}
              </span>
              {activeFolder === folder.key && (
                <motion.div layoutId="activeFolderLine" className="absolute bottom-0 left-0 right-0 h-1 bg-current" />
              )}
            </button>
          ))}
        </div>

        {/* Folder Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <AnimatePresence mode="wait">
             {slots[activeFolder].length > 0 ? (
               slots[activeFolder].map((slot: any) => (
                <motion.div 
                  key={slot.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-gray-100 p-8 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-500 group"
                >
                   <div className="flex justify-between items-start mb-8">
                      <div>
                         <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1">Global Reference</p>
                         <p className="text-xs font-bold text-bbBlue uppercase tracking-tighter">BBCN-{slot.id}</p>
                      </div>
                      <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-[1.25rem] flex items-center justify-center group-hover:bg-bbBlue/5 transition-colors">
                         <svg className="w-6 h-6 text-gray-300 group-hover:text-bbBlue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                      </div>
                   </div>

                   <h3 className="text-2xl font-serif font-bold text-charcoal mb-2">{slot.shop}</h3>
                   <p className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest text-[10px]">{slot.service}</p>

                   <div className="grid grid-cols-2 gap-4 pt-8 border-t border-gray-50">
                      <div>
                         <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Appointment</p>
                         <p className="text-[11px] font-bold text-charcoal uppercase tracking-tighter mt-1">{slot.date}</p>
                         <p className="text-[10px] font-medium text-gray-400">{slot.time}</p>
                      </div>
                      {activeFolder === 'Approved' ? (
                         <div className="text-right">
                            <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Settled</p>
                            <p className="text-lg font-serif font-bold text-bbBlue mt-1">${slot.price}</p>
                         </div>
                      ) : (
                         <div className="text-right">
                            <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Network Status</p>
                            <p className={`text-[11px] font-bold uppercase tracking-tighter mt-1 px-3 py-1 rounded-full inline-block ${activeFolder === 'Rejected' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                               {activeFolder === 'Rejected' ? 'Declined' : 'Failed'}
                            </p>
                         </div>
                      )}
                   </div>

                   {(slot.reason || slot.error) && (
                      <div className="mt-8 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Network Response</p>
                         <p className="text-[11px] font-medium text-gray-600 leading-relaxed italic">"{slot.reason || slot.error}"</p>
                      </div>
                   )}
                </motion.div>
               ))
             ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full py-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-50 rounded-[4rem]"
                >
                   <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                   </div>
                   <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em]">No activity found in this directory</p>
                </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
