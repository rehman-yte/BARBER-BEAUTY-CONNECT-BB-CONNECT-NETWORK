import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PartnerBookingsExportHubProps {
  partners: any[];
  bookings: any[];
  onBack: () => void;
  configFee?: number;
}

export const PartnerBookingsExportHub: React.FC<PartnerBookingsExportHubProps> = ({
  partners,
  bookings,
  onBack,
  configFee = 10
}) => {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(
    partners && partners.length > 0 ? partners[0].id : ''
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Current selected partner object
  const currentPartner = useMemo(() => {
    return partners.find(p => p.id === selectedPartnerId) || partners[0] || null;
  }, [partners, selectedPartnerId]);

  // Isolate bookings strictly for the selected partner (NO DATA MIXING)
  const partnerBookings = useMemo(() => {
    if (!currentPartner) return [];
    const pId = currentPartner.id;
    const pName = (currentPartner.brandName || currentPartner.brand_name || '').toLowerCase().trim();

    return bookings.filter(b => {
      const matchId = (b.shopId && b.shopId === pId) || (b.partnerId && b.partnerId === pId);
      const matchName = pName && (
        (b.shopName && b.shopName.toLowerCase().trim() === pName) ||
        (b.partnerName && b.partnerName.toLowerCase().trim() === pName)
      );
      return matchId || matchName;
    });
  }, [bookings, currentPartner]);

  // Apply status & search filters
  const filteredBookings = useMemo(() => {
    return partnerBookings.filter(b => {
      const rawStatus = String(b.status || '').toLowerCase().trim();
      
      // Status filtering
      if (statusFilter !== 'all') {
        if (statusFilter === 'accepted') {
          if (!['accepted', 'confirmed'].includes(rawStatus)) return false;
        } else if (statusFilter === 'completed') {
          if (!['completed', 'settled', 'finished'].includes(rawStatus)) return false;
        } else if (statusFilter === 'rejected') {
          if (!['rejected'].includes(rawStatus)) return false;
        } else if (statusFilter === 'failed') {
          if (!['failed', 'failed_timeout', 'timed_out', 'timeout', 'expired'].includes(rawStatus)) return false;
        } else if (statusFilter === 'payment_held') {
          if (!['payment_held', 'settlement_due', 'pending_settlement'].includes(rawStatus)) return false;
        } else if (statusFilter === 'cancelled') {
          if (!['cancelled', 'cancelled by customer', 'refunded', 'cancelled_refunded'].includes(rawStatus)) return false;
        } else if (statusFilter === 'pending') {
          if (!['pending', 'waiting', 'unconfirmed'].includes(rawStatus)) return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const custName = String(b.customerName || b.userName || '').toLowerCase();
        const custMobile = String(b.customerMobile || b.mobile || b.userMobile || '');
        const service = String(b.serviceName || b.service || '').toLowerCase();
        const id = String(b.id || b.bookingId || '').toLowerCase();
        if (!custName.includes(query) && !custMobile.includes(query) && !service.includes(query) && !id.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [partnerBookings, statusFilter, searchTerm]);

  // Statistics for this specific partner
  const statsSummary = useMemo(() => {
    let completedCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    let totalGross = 0;

    partnerBookings.forEach(b => {
      const s = String(b.status || '').toLowerCase().trim();
      const price = parseFloat(b.price || b.amount || 0);

      if (['completed', 'settled', 'finished'].includes(s)) {
        completedCount++;
        totalGross += price;
      } else if (['accepted', 'confirmed'].includes(s)) {
        acceptedCount++;
        totalGross += price;
      } else if (['rejected'].includes(s)) {
        rejectedCount++;
      } else if (['failed', 'failed_timeout', 'timed_out', 'timeout', 'expired'].includes(s)) {
        failedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      total: partnerBookings.length,
      completed: completedCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
      failed: failedCount,
      pending: pendingCount,
      totalGross
    };
  }, [partnerBookings]);

  // STRICTLY ISOLATED CSV EXPORT FUNCTION (No Data Mixing)
  const handleExportCSV = () => {
    if (!currentPartner || filteredBookings.length === 0) {
      alert("No booking data available to export for this selection.");
      return;
    }

    const partnerName = currentPartner.brandName || currentPartner.brand_name || 'Partner_Salon';
    const partnerSlug = partnerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const today = new Date().toISOString().slice(0, 10);

    const headers = [
      'Booking ID',
      'Appointment Date',
      'Time Slot',
      'Partner Name',
      'Customer Name',
      'Customer Mobile',
      'Customer UPI',
      'Service Booked',
      'Worker Assigned',
      'Gross Amount (INR)',
      `Platform Fee (${configFee}%) (INR)`,
      'Net Partner Payout (INR)',
      'Booking Status',
      'Payment Status',
      'Settled Status',
      'Created Date & Time',
      'Status / Cancellation Note'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredBookings.map(b => {
      const gross = parseFloat(b.price || b.amount || 0);
      const fee = (gross * configFee) / 100;
      const net = gross - fee;
      const rawStatus = b.status || 'Pending';
      const isSettled = b.settled || b.isSettled || b.payoutStatus === 'settled' ? 'Settled' : 'Unsettled';

      return [
        escapeCSV(b.id || b.bookingId || ''),
        escapeCSV(b.date || b.appointmentDate || b.bookingDate || ''),
        escapeCSV(b.time || b.timeSlot || b.slot || ''),
        escapeCSV(partnerName),
        escapeCSV(b.customerName || b.userName || 'Customer'),
        escapeCSV(b.customerMobile || b.mobile || b.userMobile || ''),
        escapeCSV(b.customerUpi || b.upiId || ''),
        escapeCSV(b.serviceName || b.service || 'Grooming Service'),
        escapeCSV(b.workerName || 'Staff Member'),
        gross.toFixed(2),
        fee.toFixed(2),
        net.toFixed(2),
        escapeCSV(rawStatus),
        escapeCSV(b.paymentStatus || b.payment_status || 'paid'),
        escapeCSV(isSettled),
        escapeCSV(b.createdAt || ''),
        escapeCSV(b.cancelReason || b.statusReason || b.message || '')
      ].join(',');
    });

    // UTF-8 BOM ensures Excel cleanly displays currency and special characters without corruption
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BBConnect_${partnerSlug}_Bookings_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(`✓ Successfully exported ${filteredBookings.length} bookings for ${partnerName}!`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const getStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase().trim();
    if (['completed', 'settled', 'finished'].includes(s)) {
      return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">✓ Completed</span>;
    }
    if (['accepted', 'confirmed'].includes(s)) {
      return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">Accepted</span>;
    }
    if (['rejected'].includes(s)) {
      return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">✕ Rejected</span>;
    }
    if (['failed', 'failed_timeout', 'timed_out', 'timeout', 'expired'].includes(s)) {
      return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">⏱ Failed / Timeout</span>;
    }
    if (['payment_held', 'settlement_due', 'pending_settlement'].includes(s)) {
      return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">🔒 Escrow Held</span>;
    }
    if (['cancelled', 'cancelled by customer', 'refunded', 'cancelled_refunded'].includes(s)) {
      return <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">Cancelled</span>;
    }
    return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">⏳ {status || 'Pending'}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="font-sans">
      {/* Top Banner & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-black uppercase text-[#0056b3] bg-[#0056b3]/10 px-2.5 py-1 rounded-full tracking-wider">
              A-Z SLOT AUDIT & EXPORT ENGINE
            </span>
            <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full tracking-wider">
              ISOLATED CSV FILES (NO MIXING)
            </span>
          </div>
          <h2 className="text-3xl font-serif font-bold text-black">
            PARTNER SLOT BOOKING DATA
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.25em] mt-1">
            Real-time customer slot logs, acceptance rates, and downloadable CSV records for each partner
          </p>
        </div>

        <button 
          onClick={onBack}
          className="self-start md:self-auto text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-full transition-all"
        >
          ← Back to Overview
        </button>
      </div>

      {/* Export Toast Notification */}
      <AnimatePresence>
        {exportNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-wider shadow-lg flex items-center justify-between"
          >
            <span>{exportNotice}</span>
            <span className="text-xs">💾</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PARTNER SELECTOR BAR - Crucial for zero data mixing */}
      <div className="bg-white border-2 border-gray-100 p-6 rounded-[2.5rem] shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Select Specific Partner (Data Stays Strictly Isolated)
            </label>
            <div className="relative">
              <select 
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-black font-bold text-sm px-5 py-3.5 rounded-2xl appearance-none focus:outline-none focus:border-[#0056b3] transition-all cursor-pointer"
              >
                {partners.map(p => (
                  <option key={p.id} value={p.id}>
                    🏪 {p.brandName || p.brand_name || 'Unnamed Salon'} — Owner: {p.ownerName || 'Partner'} ({p.category || 'Salon'})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold text-xs">
                ▼
              </div>
            </div>
          </div>

          {currentPartner && (
            <div className="flex items-center gap-3 self-end lg:self-center">
              <button
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 hover:shadow-xl transition-all flex items-center gap-2 active:scale-95"
              >
                <span>📥</span> DOWNLOAD {currentPartner.brandName || 'PARTNER'} CSV (EXCEL)
              </button>
            </div>
          )}
        </div>

        {/* Selected Partner Snapshot Card */}
        {currentPartner && (
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Total Slots</p>
              <p className="text-xl font-bold text-black mt-1">{statsSummary.total}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl">
              <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Completed</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{statsSummary.completed}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl">
              <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">Accepted</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{statsSummary.accepted}</p>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl">
              <p className="text-[8px] font-bold text-rose-600 uppercase tracking-widest">Rejected</p>
              <p className="text-xl font-bold text-rose-700 mt-1">{statsSummary.rejected}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl">
              <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest">Timed Out / Failed</p>
              <p className="text-xl font-bold text-amber-700 mt-1">{statsSummary.failed}</p>
            </div>
            <div className="bg-black text-white p-4 rounded-2xl">
              <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Gross Value</p>
              <p className="text-xl font-bold text-white mt-1">₹{statsSummary.totalGross.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'All Slots' },
            { id: 'accepted', label: 'Accepted' },
            { id: 'completed', label: 'Completed' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'failed', label: 'Failed / Timeout' },
            { id: 'payment_held', label: 'Escrow' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === tab.id
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72 relative">
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer, phone, slot..."
            className="w-full bg-gray-50 border border-gray-200 text-xs px-4 py-2.5 rounded-xl font-medium focus:outline-none focus:border-[#0056b3]"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* A-Z SLOT BOOKING DATA TABLE */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Slot ID & Time</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Customer Details</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Service & Staff</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Appointment</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Gross Price</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Slot Status</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Settlement</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Audit / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
              {filteredBookings.map((b: any) => {
                const price = parseFloat(b.price || b.amount || 0);
                const isSettled = b.settled || b.isSettled || b.payoutStatus === 'settled';

                return (
                  <tr key={b.id || Math.random()} className="hover:bg-gray-50/60 transition-colors">
                    {/* Slot ID & Created */}
                    <td className="px-6 py-4">
                      <p className="font-mono text-[10px] font-bold text-black uppercase tracking-wider">{String(b.id || '').slice(0, 10)}...</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                      </p>
                    </td>

                    {/* Customer Info */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-black">{b.customerName || b.userName || 'Customer'}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{b.customerMobile || b.mobile || b.userMobile || 'No Phone'}</p>
                      {b.customerUpi && <p className="text-[9px] text-[#0056b3] font-mono">{b.customerUpi}</p>}
                    </td>

                    {/* Service & Staff */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-black">{b.serviceName || b.service || 'Grooming'}</p>
                      <p className="text-[10px] text-gray-400">Staff: {b.workerName || 'Default Specialist'}</p>
                    </td>

                    {/* Appointment Slot */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-black">{b.date || b.appointmentDate || 'Today'}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{b.time || b.timeSlot || 'Scheduled Slot'}</p>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-black text-sm">₹{price.toFixed(2)}</p>
                      <p className="text-[8px] text-gray-400 uppercase tracking-wider">Fee: ₹{((price * configFee) / 100).toFixed(2)}</p>
                    </td>

                    {/* Slot Status */}
                    <td className="px-6 py-4">
                      {getStatusBadge(b.status)}
                    </td>

                    {/* Settlement */}
                    <td className="px-6 py-4">
                      {isSettled ? (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                          ✓ Settled
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                          ⏱ Pending
                        </span>
                      )}
                    </td>

                    {/* Audit / Notes */}
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-[10px] text-gray-500 truncate" title={b.cancelReason || b.statusReason || b.message || 'Standard Slot Execution'}>
                        {b.cancelReason || b.statusReason || b.message || 'Standard Slot Execution'}
                      </p>
                    </td>
                  </tr>
                );
              })}

              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <p className="text-3xl mb-2">📂</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      No matching slot bookings found for {currentPartner?.brandName || 'this partner'}.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
