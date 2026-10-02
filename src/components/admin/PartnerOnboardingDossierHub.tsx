import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface PartnerOnboardingDossierHubProps {
  partners: any[];
  onRefresh: () => void;
  onBack: () => void;
}

export const PartnerOnboardingDossierHub: React.FC<PartnerOnboardingDossierHubProps> = ({
  partners,
  onRefresh,
  onBack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'suspended'>('all');
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Editable form state for Admin
  const [editForm, setEditForm] = useState({
    brandName: '',
    ownerName: '',
    mobileNumber: '',
    address: '',
    category: '',
    workerQuantity: 1,
    upiId: '',
    status: 'approved',
    adminNotes: ''
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Open Dossier Modal
  const openDossier = (partner: any) => {
    setSelectedPartner(partner);
    setEditForm({
      brandName: partner.brandName || partner.brand_name || '',
      ownerName: partner.ownerName || partner.owner_name || '',
      mobileNumber: partner.mobileNumber || partner.mobile || '',
      address: partner.address || '',
      category: partner.category || 'Barber',
      workerQuantity: partner.workerQuantity || partner.workerCount || 1,
      upiId: partner.upiId || partner.upi_id || partner.upi || '',
      status: partner.status || (partner.adminApproved ? 'approved' : 'pending'),
      adminNotes: partner.adminNotes || partner.internalRemarks || ''
    });
    setIsEditing(false);
  };

  // Save changes made by Admin to Firestore
  const handleSaveDossier = async () => {
    if (!selectedPartner?.id) return;
    setIsSaving(true);
    try {
      const pRef = doc(db, 'partners', selectedPartner.id);
      const updates = {
        brandName: editForm.brandName,
        brand_name: editForm.brandName,
        ownerName: editForm.ownerName,
        owner_name: editForm.ownerName,
        mobileNumber: editForm.mobileNumber,
        mobile: editForm.mobileNumber,
        address: editForm.address,
        category: editForm.category,
        workerQuantity: Number(editForm.workerQuantity),
        upiId: editForm.upiId,
        status: editForm.status,
        adminApproved: editForm.status === 'approved' || editForm.status === 'active',
        adminNotes: editForm.adminNotes,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(pRef, updates);
      
      // Update local object
      setSelectedPartner({ ...selectedPartner, ...updates });
      setIsEditing(false);
      showToast("✓ Partner Onboarding Dossier & documents saved successfully!");
      onRefresh();
    } catch (err: any) {
      console.error("Dossier update error:", err);
      alert("Failed to update dossier: " + (err?.message || 'Permission denied'));
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Status change from card
  const handleQuickStatusChange = async (partnerId: string, newStatus: string) => {
    try {
      const pRef = doc(db, 'partners', partnerId);
      await updateDoc(pRef, {
        status: newStatus,
        adminApproved: newStatus === 'approved' || newStatus === 'active',
        updatedAt: new Date().toISOString()
      });
      showToast(`✓ Partner status updated to ${newStatus.toUpperCase()}`);
      onRefresh();
    } catch (err: any) {
      console.error("Quick status error:", err);
      alert("Failed to update status: " + err.message);
    }
  };

  // Filter partners
  const filteredPartners = partners.filter(p => {
    // Status filter
    if (statusFilter !== 'all') {
      const s = String(p.status || (p.adminApproved ? 'approved' : 'pending')).toLowerCase();
      if (statusFilter === 'approved' && !['approved', 'active'].includes(s)) return false;
      if (statusFilter === 'pending' && s !== 'pending') return false;
      if (statusFilter === 'rejected' && s !== 'rejected') return false;
      if (statusFilter === 'suspended' && s !== 'suspended') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const bName = String(p.brandName || p.brand_name || '').toLowerCase();
      const oName = String(p.ownerName || p.owner_name || '').toLowerCase();
      const phone = String(p.mobileNumber || p.mobile || '').toLowerCase();
      const addr = String(p.address || '').toLowerCase();
      const upi = String(p.upiId || '').toLowerCase();
      if (!bName.includes(q) && !oName.includes(q) && !phone.includes(q) && !addr.includes(q) && !upi.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="font-sans">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[3000] bg-black text-white px-8 py-4 rounded-full border border-white/10 shadow-2xl flex items-center gap-3"
          >
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <p className="text-[10px] font-black uppercase tracking-widest">{toastMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-black uppercase text-[#0056b3] bg-[#0056b3]/10 px-2.5 py-1 rounded-full tracking-wider">
              ONBOARDING MASTER ARCHIVE
            </span>
            <span className="text-[9px] font-black uppercase text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full tracking-wider">
              GOVERNANCE & DOCUMENT MANAGEMENT
            </span>
          </div>
          <h2 className="text-3xl font-serif font-bold text-black">
            PARTNER ONBOARDING A-Z DOSSIER
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.25em] mt-1">
            Access and manage complete onboarding profiles, identity proofs, shop pictures, and legal credentials for every partner
          </p>
        </div>

        <button 
          onClick={onBack}
          className="self-start md:self-auto text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-full transition-all"
        >
          ← Back to Overview
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: `All Partners (${partners.length})` },
            { id: 'approved', label: 'Approved & Active' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'suspended', label: 'Suspended' },
            { id: 'rejected', label: 'Rejected' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
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

        {/* Search */}
        <div className="w-full md:w-80 relative">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search salon, owner, phone, address..."
            className="w-full bg-gray-50 border border-gray-200 text-xs px-4 py-3 rounded-xl font-medium focus:outline-none focus:border-[#0056b3]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* PARTNERS DOSSIER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map((p: any) => {
          const brand = p.brandName || p.brand_name || 'Unnamed Salon';
          const owner = p.ownerName || p.owner_name || 'Partner Owner';
          const phone = p.mobileNumber || p.mobile || 'No Phone';
          const upi = p.upiId || p.upi_id || p.upi || 'Not Configured';
          const status = p.status || (p.adminApproved ? 'approved' : 'pending');
          const hasGovId = Boolean(p.govtIdUrl || p.govId || p.gov_id);
          const shopImgsCount = Array.isArray(p.shopImages) ? p.shopImages.length : (Array.isArray(p.brandImages) ? p.brandImages.length : 0);

          return (
            <div 
              key={p.id}
              className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Owner Avatar & Status */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {p.ownerPicture ? (
                      <img 
                        src={p.ownerPicture} 
                        alt={owner} 
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-gray-100 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400">
                        💈
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-black text-base line-clamp-1">{brand}</h3>
                      <p className="text-[11px] text-gray-500 font-medium">Owner: {owner}</p>
                      <span className="text-[8px] font-black uppercase text-[#0056b3] bg-[#0056b3]/10 px-2 py-0.5 rounded-full inline-block mt-1">
                        {p.category || 'Barber'}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {status === 'approved' || status === 'active' ? (
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider">
                        ✓ Approved
                      </span>
                    ) : status === 'pending' ? (
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider">
                        ⏳ Pending Vetting
                      </span>
                    ) : status === 'suspended' ? (
                      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider">
                        ⏸ Suspended
                      </span>
                    ) : (
                      <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider">
                        ✕ Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Key Onboarding Meta */}
                <div className="space-y-2 mb-5 text-[11px] text-gray-600 bg-gray-50 p-4 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 uppercase text-[9px] font-bold">Contact Phone:</span>
                    <span className="font-bold text-black font-mono">{phone}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 uppercase text-[9px] font-bold">Settlement UPI:</span>
                    <span className="font-bold text-[#0056b3] font-mono truncate max-w-[160px]">{upi}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 uppercase text-[9px] font-bold">Workers / Staff:</span>
                    <span className="font-bold text-black">{p.workerQuantity || p.workerCount || 1} Staff</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200/50">
                    <span className="text-gray-400 uppercase text-[9px] font-bold block mb-0.5">Physical Address:</span>
                    <p className="text-[10px] text-gray-700 line-clamp-2">{p.address || 'Address not registered'}</p>
                  </div>
                </div>

                {/* Document Status Indicators */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  <div className={`p-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    hasGovId ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-600'
                  }`}>
                    <span>{hasGovId ? '🪪' : '⚠️'}</span>
                    <span>{hasGovId ? 'Govt ID Proof: Verified' : 'Govt ID Missing'}</span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏪</span>
                    <span>{shopImgsCount} Shop Photos</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center gap-2">
                <button
                  onClick={() => openDossier(p)}
                  className="flex-1 bg-black hover:bg-[#0056b3] text-white py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] transition-all text-center shadow-md active:scale-95"
                >
                  📁 Inspect A-Z Dossier & Manage
                </button>

                {status !== 'approved' && status !== 'active' ? (
                  <button
                    onClick={() => handleQuickStatusChange(p.id, 'approved')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all"
                    title="Quick Approve Partner"
                  >
                    ✓
                  </button>
                ) : (
                  <button
                    onClick={() => handleQuickStatusChange(p.id, 'suspended')}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all"
                    title="Suspend Partner Temporarily"
                  >
                    ⏸
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredPartners.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white border border-gray-100 rounded-[2.5rem]">
            <p className="text-4xl mb-2">📂</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              No registered partner dossiers match your search/filter.
            </p>
          </div>
        )}
      </div>

      {/* FULL A-Z DOSSIER INSPECTION & MANAGEMENT MODAL */}
      <AnimatePresence>
        {selectedPartner && (
          <div className="fixed inset-0 z-[2500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-4xl max-h-[92vh] rounded-[3rem] p-6 sm:p-10 shadow-2xl relative overflow-y-auto font-sans"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedPartner(null)}
                className="absolute top-6 right-6 sm:top-8 sm:right-8 w-10 h-10 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center text-sm font-bold transition-all"
              >
                ✕
              </button>

              {/* Modal Header */}
              <div className="mb-8 pb-6 border-b border-gray-100">
                <span className="text-[9px] font-black uppercase text-[#0056b3] bg-[#0056b3]/10 px-3 py-1 rounded-full tracking-wider">
                  OFFICIAL ONBOARDING DOSSIER #{selectedPartner.id?.slice(0, 10)}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-black">
                      {selectedPartner.brandName || selectedPartner.brand_name || 'Partner Salon'}
                    </h2>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                      Registered Owner: {selectedPartner.ownerName || 'Partner'} • Category: {selectedPartner.category || 'Barber'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
                        isEditing ? 'bg-gray-200 text-black' : 'bg-black text-white hover:bg-[#0056b3]'
                      }`}
                    >
                      {isEditing ? 'Cancel Editing' : '✏️ Edit Profile & Notes'}
                    </button>
                  </div>
                </div>
              </div>

              {/* DOSSIER BODY */}
              <div className="space-y-8">
                {/* 1. IDENTITY & OWNER PROFILE SECTION */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0056b3] mb-4">
                    1. Proprietor & Identity Credentials
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-3xl">
                    <div className="flex flex-col items-center justify-center text-center">
                      {selectedPartner.ownerPicture ? (
                        <div className="relative group cursor-pointer" onClick={() => setPreviewImage(selectedPartner.ownerPicture)}>
                          <img 
                            src={selectedPartner.ownerPicture} 
                            alt="Owner" 
                            className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-md group-hover:scale-105 transition-all"
                          />
                          <span className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold uppercase transition-all">
                            🔍 View Full
                          </span>
                        </div>
                      ) : (
                        <div className="w-28 h-28 rounded-2xl bg-gray-200 flex items-center justify-center text-3xl text-gray-400">
                          👤
                        </div>
                      )}
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">Proprietor Portrait</p>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase">Owner Full Name</label>
                            <input 
                              type="text" 
                              value={editForm.ownerName} 
                              onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase">Brand / Salon Name</label>
                            <input 
                              type="text" 
                              value={editForm.brandName} 
                              onChange={(e) => setEditForm({ ...editForm, brandName: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase">Contact Mobile Number</label>
                            <input 
                              type="text" 
                              value={editForm.mobileNumber} 
                              onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold mt-1 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase">Workers / Staff Quantity</label>
                            <input 
                              type="number" 
                              value={editForm.workerQuantity} 
                              onChange={(e) => setEditForm({ ...editForm, workerQuantity: Number(e.target.value) })}
                              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold mt-1"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Proprietor Name</p>
                            <p className="font-bold text-black text-sm">{selectedPartner.ownerName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Mobile Number</p>
                            <a href={`tel:${selectedPartner.mobileNumber || selectedPartner.mobile}`} className="font-bold text-[#0056b3] text-sm hover:underline font-mono">
                              {selectedPartner.mobileNumber || selectedPartner.mobile || 'N/A'} 📞
                            </a>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Partner Category</p>
                            <p className="font-bold text-black">{selectedPartner.category || 'Barber'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Staff Count</p>
                            <p className="font-bold text-black">{selectedPartner.workerQuantity || selectedPartner.workerCount || 1} Specialist(s)</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Onboarded Timestamp</p>
                            <p className="font-mono text-gray-600 text-[11px]">
                              {selectedPartner.createdAt || selectedPartner.updatedAt ? new Date(selectedPartner.createdAt || selectedPartner.updatedAt).toLocaleString('en-IN') : 'Registered'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Station Live Status</p>
                            <p className="font-bold text-black">
                              {selectedPartner.isLive ? '🟢 Station Online' : '⚪ Station Offline'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. PHYSICAL ADDRESS & GEOLOCATION MAPPING */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0056b3] mb-4">
                    2. Physical Location & Map Coordinates
                  </h4>
                  <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                    {isEditing ? (
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Physical Address</label>
                        <textarea 
                          value={editForm.address} 
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          rows={3}
                          className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs font-medium mt-1"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Registered Salon Address</p>
                        <p className="text-xs font-semibold text-black mt-1 leading-relaxed">
                          {selectedPartner.address || 'Address not provided'}
                        </p>
                      </div>
                    )}

                    {/* Geolocation Coords */}
                    {(selectedPartner.lat || selectedPartner.coords?.lat) && (
                      <div className="pt-3 border-t border-gray-200/50 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📍</span>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">GPS Coordinates</p>
                            <p className="text-xs font-mono font-bold text-black">
                              Lat: {selectedPartner.lat || selectedPartner.coords?.lat}, Lng: {selectedPartner.lng || selectedPartner.coords?.lng}
                            </p>
                          </div>
                        </div>

                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${selectedPartner.lat || selectedPartner.coords?.lat},${selectedPartner.lng || selectedPartner.coords?.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-black hover:bg-[#0056b3] text-white px-5 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5"
                        >
                          🗺️ View on Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. GOVERNANCE DOCUMENTS & UPLOADED PROOFS */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0056b3] mb-4">
                    3. Uploaded Governance ID & Salon Gallery Proofs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Government ID Document */}
                    <div className="bg-gray-50 p-6 rounded-3xl">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-black">
                          🪪 Governance ID / Aadhaar Proof
                        </p>
                        {selectedPartner.govtIdUrl || selectedPartner.govId ? (
                          <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full">
                            Verified Upload
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-700 text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full">
                            Missing
                          </span>
                        )}
                      </div>

                      {selectedPartner.govtIdUrl || selectedPartner.govId ? (
                        <div 
                          className="relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-gray-200 bg-white"
                          onClick={() => setPreviewImage(selectedPartner.govtIdUrl || selectedPartner.govId)}
                        >
                          <img 
                            src={selectedPartner.govtIdUrl || selectedPartner.govId} 
                            alt="Government ID" 
                            className="w-full h-44 object-contain group-hover:scale-105 transition-all p-2"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold uppercase transition-all gap-2">
                            <span>🔍 Inspect Document</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-44 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                          <span className="text-2xl mb-1">📄</span>
                          <p className="text-[10px] font-bold uppercase">No Document Uploaded</p>
                        </div>
                      )}
                    </div>

                    {/* Shop Exterior/Interior Gallery */}
                    <div className="bg-gray-50 p-6 rounded-3xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-black mb-3">
                        🏪 Shop & Salon Facility Proofs ({Array.isArray(selectedPartner.shopImages) ? selectedPartner.shopImages.length : 0})
                      </p>

                      {Array.isArray(selectedPartner.shopImages) && selectedPartner.shopImages.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                          {selectedPartner.shopImages.map((img: string, idx: number) => (
                            <div 
                              key={idx}
                              onClick={() => setPreviewImage(img)}
                              className="relative group cursor-pointer rounded-xl overflow-hidden border border-gray-200 aspect-square bg-white"
                            >
                              <img src={img} alt={`Shop ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-all" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-bold">
                                🔍
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-44 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                          <span className="text-2xl mb-1">🖼️</span>
                          <p className="text-[10px] font-bold uppercase">No Shop Photos Uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. SETTLEMENT & UPI REGISTRY */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0056b3] mb-4">
                    4. Settlement & Banking Configuration
                  </h4>
                  <div className="bg-gray-50 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex-1 w-full">
                      {isEditing ? (
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Settlement UPI ID</label>
                          <input 
                            type="text" 
                            value={editForm.upiId} 
                            onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-mono font-bold mt-1"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Registered Payout UPI ID</p>
                          <p className="text-base font-mono font-bold text-[#0056b3] mt-0.5">
                            {selectedPartner.upiId || selectedPartner.upi_id || selectedPartner.upi || 'Not Configured'}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedPartner.upiId && !isEditing && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedPartner.upiId);
                          showToast("✓ UPI ID copied to clipboard!");
                        }}
                        className="bg-black text-white hover:bg-gray-800 px-5 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all"
                      >
                        📋 Copy UPI
                      </button>
                    )}
                  </div>
                </div>

                {/* 5. ADMIN AUDIT CONTROLS & PERMANENT REMARKS */}
                <div className="pt-6 border-t border-gray-100">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0056b3] mb-4">
                    5. Admin Management Controls & Internal Audit Notes
                  </h4>
                  <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                    {/* Status Changer */}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">
                        Partner Verification Status
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'approved', label: '✓ Approved & Active', color: 'bg-emerald-600' },
                          { id: 'pending', label: '⏳ Pending Vetting', color: 'bg-amber-600' },
                          { id: 'suspended', label: '⏸ Suspended', color: 'bg-orange-600' },
                          { id: 'rejected', label: '✕ Rejected', color: 'bg-rose-600' }
                        ].map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, status: st.id })}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                              editForm.status === st.id 
                                ? `${st.color} text-white shadow-md scale-105` 
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Admin Notes */}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">
                        Internal Admin Notes & Compliance Remarks (Saved Permanently)
                      </label>
                      <textarea 
                        value={editForm.adminNotes}
                        onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                        placeholder="Add internal compliance notes, phone verification logs, address inspection status..."
                        rows={3}
                        className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-[#0056b3]"
                      />
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSaveDossier}
                        disabled={isSaving}
                        className="bg-black hover:bg-[#0056b3] text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2"
                      >
                        {isSaving ? 'Saving to Database...' : '💾 Save Dossier Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL RESOLUTION DOCUMENT / IMAGE PREVIEW MODAL */}
      <AnimatePresence>
        {previewImage && (
          <div 
            className="fixed inset-0 z-[3500] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl max-h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={previewImage} 
                alt="Document Full Preview" 
                className="max-w-full max-h-[85vh] rounded-3xl object-contain shadow-2xl border-2 border-white/20"
              />
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
              >
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
