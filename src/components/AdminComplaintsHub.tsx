import React, { useState, useEffect } from 'react';
import { 
  subscribeToAllComplaints, 
  sendAdminComplaintReply 
} from '../services/SupportService';
import { SupportComplaint } from '../types/support';
import { 
  ShieldAlert, 
  User, 
  Briefcase, 
  Search, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MessageSquare,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';

export const AdminComplaintsHub: React.FC = () => {
  const [complaints, setComplaints] = useState<SupportComplaint[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'customer' | 'partner'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected complaint for replying
  const [selectedTicket, setSelectedTicket] = useState<SupportComplaint | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'in_progress' | 'resolved'>('resolved');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccessMsg, setReplySuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAllComplaints((data) => {
      setComplaints(data);
    });
    return () => unsubscribe();
  }, []);

  // Filtered complaints
  const filteredComplaints = complaints.filter((c) => {
    // Category match (Customer vs Partner)
    if (activeCategory === 'customer' && c.category !== 'customer') return false;
    if (activeCategory === 'partner' && c.category !== 'partner') return false;

    // Status match
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = c.complaintId?.toLowerCase().includes(q);
      const matchName = c.userName?.toLowerCase().includes(q);
      const matchEmail = c.userEmail?.toLowerCase().includes(q);
      const matchIssue = c.issueType?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchEmail && !matchIssue && !matchDesc) return false;
    }

    return true;
  });

  const customerCount = complaints.filter(c => c.category === 'customer').length;
  const partnerCount = complaints.filter(c => c.category === 'partner').length;
  const openCount = complaints.filter(c => c.status === 'open').length;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await sendAdminComplaintReply(selectedTicket, replyText.trim(), replyStatus);
      
      setReplySuccessMsg(`Reply delivered successfully to ${selectedTicket.userName}'s chat!`);
      setReplyText('');
      
      // Update selected ticket in view
      setSelectedTicket(prev => prev ? {
        ...prev,
        adminReply: replyText.trim(),
        status: replyStatus,
        repliedAt: new Date().toISOString()
      } : null);

      setTimeout(() => setReplySuccessMsg(null), 4000);
    } catch (err) {
      console.error('[AdminComplaintsHub] Error sending reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-charcoal via-black to-[#0f172a] text-white p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black uppercase tracking-widest mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Official Helpdesk & Complaints Command</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight text-white">
              Complaints & Support Hub
            </h2>
            <p className="text-xs text-gray-400 max-w-xl mt-1 leading-relaxed">
              Customer aur Partner grievances ko monitor karein aur direct unke AI Chatbot me real-time official reply send karein. User chat history permanent rehti hai.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl text-center">
              <div className="text-2xl font-black text-amber-400">{openCount}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Open Tickets</div>
            </div>
            <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl text-center">
              <div className="text-2xl font-black text-white">{complaints.length}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Total Filed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Customer Complaints vs Partner Complaints */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        
        {/* Category Selector Tabs */}
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-charcoal text-white shadow'
                : 'text-gray-600 hover:text-charcoal'
            }`}
          >
            All Complaints ({complaints.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('customer')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'customer'
                ? 'bg-bbBlue text-white shadow'
                : 'text-gray-600 hover:text-bbBlue'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Customer ({customerCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('partner')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'partner'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-gray-600 hover:text-emerald-700'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Partner ({partnerCount})</span>
          </button>
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-bbBlue"
          >
            <option value="all">Status: All</option>
            <option value="open">🟡 Open</option>
            <option value="in_progress">🔄 In Progress</option>
            <option value="resolved">✅ Resolved</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Ticket, Name, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-bbBlue w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Complaints List & Reply Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Complaints List */}
        <div className={`${selectedTicket ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
          {filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">No Complaints Found</h3>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery ? 'Search criteria ke mutabiq koi ticket nahi mila.' : 'Is category me abhi koi open ya pending complaint nahi hai.'}
              </p>
            </div>
          ) : (
            filteredComplaints.map((item) => {
              const isSelected = selectedTicket?.complaintId === item.complaintId;
              const isPartner = item.category === 'partner';
              const isOpen = item.status === 'open';
              const isResolved = item.status === 'resolved';

              return (
                <div
                  key={item.complaintId}
                  onClick={() => setSelectedTicket(item)}
                  className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                    isSelected 
                      ? 'border-bbBlue ring-2 ring-bbBlue/20 bg-blue-50/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs font-black text-charcoal bg-gray-100 px-2 py-0.5 rounded">
                          {item.complaintId}
                        </span>

                        {isPartner ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> Partner
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-bbBlue border border-blue-200 flex items-center gap-1">
                            <User className="w-3 h-3" /> Customer
                          </span>
                        )}

                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          isOpen
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : isResolved
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 mt-1">
                        {item.issueType || item.subject}
                      </h4>
                    </div>

                    <div className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed bg-gray-50/60 p-2.5 rounded-xl border border-gray-100">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
                    <div>
                      <strong>{item.userName}</strong> ({item.userEmail || 'No Email'})
                    </div>

                    {item.adminReply ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px]">
                        <Check className="w-3.5 h-3.5" /> Admin Replied
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold text-[10px] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Awaiting Reply
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Ticket Detail & Admin Reply Box */}
        {selectedTicket && (
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-gray-200 shadow-xl sticky top-24">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Ticket Focus</span>
                <h3 className="text-base font-black text-charcoal">{selectedTicket.complaintId}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            {replySuccessMsg && (
              <div className="my-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{replySuccessMsg}</span>
              </div>
            )}

            <div className="space-y-4 my-4">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1">
                <div><strong>User:</strong> {selectedTicket.userName}</div>
                <div><strong>Email:</strong> {selectedTicket.userEmail || 'N/A'}</div>
                <div><strong>Role / Category:</strong> {selectedTicket.category.toUpperCase()}</div>
                <div><strong>Issue Type:</strong> {selectedTicket.issueType}</div>
                <div><strong>Submitted:</strong> {new Date(selectedTicket.createdAt).toLocaleString()}</div>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">Complaint Content</span>
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedTicket.description}
                </div>
              </div>

              {selectedTicket.adminReply && (
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 block mb-1">Previous Admin Reply</span>
                  <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.adminReply}
                    {selectedTicket.repliedAt && (
                      <div className="text-[9px] text-emerald-700 mt-2 font-mono">
                        Replied at: {new Date(selectedTicket.repliedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-bbBlue" />
                  <span>Send Official Reply to User Chat</span>
                </label>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setReplyStatus('in_progress')}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      replyStatus === 'in_progress' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyStatus('resolved')}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      replyStatus === 'resolved' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Resolve
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Aapka message direct user ke Chatbot me deliver hoga..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-bbBlue resize-none"
              />

              <button
                type="submit"
                disabled={isSendingReply || !replyText.trim()}
                className="w-full bg-charcoal hover:bg-black text-white text-xs font-black uppercase tracking-wider py-3 rounded-xl transition-all shadow-md disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-400" />
                <span>{isSendingReply ? 'Sending to User Chat...' : 'Send Official Reply & Update'}</span>
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
};
