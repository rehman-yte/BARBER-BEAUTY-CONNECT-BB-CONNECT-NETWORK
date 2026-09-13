import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeToUserChat, 
  saveChatMessage, 
  sendAiChatQuery, 
  raiseComplaint 
} from '../services/SupportService';
import { SupportChatMessage } from '../types/support';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  ShieldAlert, 
  ChevronDown, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export const AIChatBot: React.FC = () => {
  const { user, isLoggedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Complaint Form State
  const [issueType, setIssueType] = useState('Slot Booking Problem');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSuccessId, setTicketSuccessId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // If user is not logged in, chatbot icon is not displayed
  if (!isLoggedIn || !user) {
    return null;
  }

  const userId = user.uid || (user as any).id || (user.email || '').replace(/[^a-zA-Z0-9]/g, '_');
  const userName = (user as any).name || (user as any).ownerName || user.email?.split('@')[0] || 'Member';
  const userRole = (user.role === 'partner' ? 'partner' : 'customer') as 'customer' | 'partner';

  // Real-time Chat Subscription
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserChat(userId, (fetchedMessages) => {
      setMessages(fetchedMessages);
      
      // Calculate unread admin messages when chat is closed
      if (!isOpen) {
        const adminReplies = fetchedMessages.filter(m => m.sender === 'admin');
        const lastSeen = Number(localStorage.getItem(`bb_last_seen_chat_${userId}`) || '0');
        const unread = adminReplies.filter(m => m.timestamp > lastSeen).length;
        setUnreadCount(unread);
      }
    });

    return () => unsubscribe();
  }, [userId, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      localStorage.setItem(`bb_last_seen_chat_${userId}`, String(Date.now()));
      setUnreadCount(0);
    }
  }, [messages, isOpen, userId]);

  // Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    setIsLoading(true);

    try {
      // 1. Save user message permanently to Firestore
      const userMsg = await saveChatMessage(userId, {
        sender: 'user',
        text,
        timestamp: Date.now()
      });

      // 2. Query AI backend proxy (Gemini 3.8 Flash with full knowledge)
      const aiResponse = await sendAiChatQuery(
        text,
        [...messages, userMsg],
        {
          uid: userId,
          email: user.email,
          name: userName,
          role: userRole
        }
      );

      // 3. Save AI response permanently to Firestore
      await saveChatMessage(userId, {
        sender: 'ai',
        text: aiResponse,
        timestamp: Date.now()
      });

    } catch (err) {
      console.error('[AIChatBot] Error sending message:', err);
      await saveChatMessage(userId, {
        sender: 'ai',
        text: 'Maaf kijiye, technical connection issue ki wajah se response aane me deri ho rahi hai. Aap apni complaint "Raise Complaint" option se register kar sakte hain.',
        timestamp: Date.now()
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  };

  // Submit Official Complaint handler
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintDesc.trim() || isSubmittingTicket) return;

    setIsSubmittingTicket(true);
    try {
      const createdComplaint = await raiseComplaint({
        userId,
        userEmail: user.email || '',
        userName,
        userRole,
        issueType,
        subject: `${issueType} - ${userName}`,
        description: complaintDesc.trim()
      });

      setTicketSuccessId(createdComplaint.complaintId);
      setComplaintDesc('');
      setTimeout(() => {
        setShowComplaintForm(false);
        setTicketSuccessId(null);
      }, 2500);

    } catch (err) {
      console.error('[AIChatBot] Error filing complaint:', err);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* FLOATING LAUNCHER ICON (Bottom-Right Corner) */}
      {/* ------------------------------------------------------------- */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
          {unreadCount > 0 && (
            <div className="mb-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg animate-bounce flex items-center gap-1.5 border border-white/20">
              <span>👑 New Admin Reply</span>
            </div>
          )}

          <button
            id="bb-ai-chatbot-launcher"
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-charcoal via-black to-[#1e293b] text-white shadow-2xl border-2 border-bbBlue/60 hover:border-bbBlue hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            aria-label="Open BB Connect AI Support Chatbot"
          >
            {/* Pulsing ring indicator */}
            <span className="absolute -inset-1 rounded-full bg-bbBlue/30 animate-ping opacity-50" />
            
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-bbBlue group-hover:rotate-12 transition-transform duration-300" />
              <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute -top-1 -right-1" />
            </div>

            {/* Notification unread bubble */}
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow">
                {unreadCount}
              </span>
            ) : (
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full" />
            )}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EXPANDED CHATBOT WINDOW */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <div 
          id="bb-ai-chatbot-modal"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="bg-charcoal text-white px-5 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-bbBlue/30 to-bbBlue/10 border border-bbBlue/40 flex items-center justify-center">
                <Bot className="w-6 h-6 text-bbBlue" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-charcoal rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">BB Connect AI Support</h3>
                  <span className="text-[9px] bg-bbBlue/20 text-bbBlue font-black px-2 py-0.5 rounded-full uppercase border border-bbBlue/30">
                    Bilingual
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {userRole === 'partner' ? 'Studio Partner Desk' : 'Customer Helpdesk'} • Hi/En Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowComplaintForm(!showComplaintForm)}
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  showComplaintForm 
                    ? 'bg-amber-500 text-black font-black' 
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40'
                }`}
                title="Raise Official Complaint"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{showComplaintForm ? 'Chat View' : 'Complaint'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors ml-1"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Notice Header */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 border-b border-gray-100 px-4 py-2 flex items-center justify-between text-[10px] text-gray-600 shrink-0">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Chatbot answers in <strong>Hindi & English</strong>
            </span>
            <span className="text-[9px] text-gray-400 uppercase font-semibold">🔒 Data Never Deleted</span>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* COMPLAINT REGISTRATION SUB-PANEL */}
          {/* ----------------------------------------------------------- */}
          {showComplaintForm ? (
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50/80 flex flex-col justify-between">
              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-900">
                  <div className="flex items-center gap-2 font-black uppercase text-[11px] text-red-700">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Raise Official Support Complaint</span>
                  </div>
                  <p className="mt-1 text-[11px] text-red-600 leading-relaxed">
                    Aapki complaint direct BB Connect Admin Panel par forward hogi. Admin iska review karke isi chat me reply karenge.
                  </p>
                </div>

                {ticketSuccessId && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-center animate-in zoom-in-95">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <div className="text-xs font-black uppercase text-emerald-800 tracking-wider">
                      Complaint Lodged Successfully!
                    </div>
                    <div className="text-sm font-black text-charcoal mt-1">
                      Ticket ID: <span className="text-bbBlue">{ticketSuccessId}</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 mt-1">
                      Admin ko notification bhej di gayi hai. Returning to chat...
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-700 mb-1.5">
                    Complaint Category
                  </label>
                  <div className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-gray-800">
                    {userRole === 'partner' ? '💼 Studio Partner Complaint' : '👤 Customer Complaint'}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-700 mb-1.5">
                    Problem Type / समस्या का प्रकार
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-bbBlue"
                  >
                    <option value="Slot Booking Problem">Slot Booking / Appointment Problem</option>
                    <option value="5-Min Timeout / Refund Issue">5-Min Timeout / Auto-Refund Issue</option>
                    <option value="Payment Debited but Not Confirmed">Payment Debited but Not Confirmed</option>
                    <option value="Product Order / Delivery Delay">Product Order / Delivery Delay</option>
                    <option value="Partner Behavior / Service Quality">Partner Service / Behavior Grievance</option>
                    <option value="Partner Payout / Ledger Dispute">Partner Payout / Ledger Dispute</option>
                    <option value="Other Account / Tech Issue">Other Technical / Platform Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-700 mb-1.5">
                    Detailed Description / अपनी समस्या का विवरण दें *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    placeholder="Problem ko explain karein (e.g. Booking ID, Payment details, Shop name, etc.)..."
                    className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:border-bbBlue placeholder:text-gray-400 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingTicket || !complaintDesc.trim()}
                    className="flex-1 bg-charcoal hover:bg-black text-white text-xs font-black uppercase tracking-wider py-3 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>{isSubmittingTicket ? 'Filing Complaint...' : 'Submit to Admin Panel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowComplaintForm(false)}
                    className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ----------------------------------------------------------- */
            /* CHAT CONVERSATION VIEW */
            /* ----------------------------------------------------------- */
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-gray-50/40">
              
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                
                {/* Welcome / Info Banner */}
                {messages.length === 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-bbBlue/10 flex items-center justify-center text-bbBlue font-black">
                        AI
                      </div>
                      <div>
                        <div className="text-xs font-black text-charcoal">
                          Namaste, {userName}! 👋
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Barber & Beauty Connect Official AI Assistant
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      Aap slot booking, payment refund, product shopping ya partner terminal ke baare me kuch bhi pooch sakte hain. Main Hindi aur English dono me baat kar sakta hoon.
                    </p>

                    {/* Topic Quick Chips */}
                    <div className="pt-2 border-t border-gray-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Quick Questions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendMessage('Slot booking kaise karte hain aur 5-minute escrow kya hai?')}
                          className="text-[10px] font-semibold bg-gray-100 hover:bg-bbBlue/10 hover:text-bbBlue text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors text-left"
                        >
                          ✂️ Slot Booking & 5-Min Escrow
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendMessage('Refund kab aur kaise milta hai?')}
                          className="text-[10px] font-semibold bg-gray-100 hover:bg-bbBlue/10 hover:text-bbBlue text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors text-left"
                        >
                          💳 Refund & Wallet Status
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendMessage('Shop se products kaise kharidein?')}
                          className="text-[10px] font-semibold bg-gray-100 hover:bg-bbBlue/10 hover:text-bbBlue text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors text-left"
                        >
                          🛍️ Marketplace Shopping
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowComplaintForm(true)}
                          className="text-[10px] font-black bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg transition-colors text-left border border-red-200"
                        >
                          🚨 Raise Complaint (Admin)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Persistent Message History */}
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  const isAdmin = msg.sender === 'admin';
                  const isAi = msg.sender === 'ai';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      {/* Admin Message Highlight */}
                      {isAdmin ? (
                        <div className="max-w-[90%] bg-gradient-to-tr from-amber-500/10 via-amber-100/50 to-amber-50 border-2 border-amber-500/40 text-charcoal rounded-2xl p-3.5 shadow-md">
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-900 tracking-wider mb-1.5 pb-1 border-b border-amber-300/40">
                            <span>👑 OFFICIAL BB ADMIN RESPONSE</span>
                            {msg.complaintId && (
                              <span className="ml-auto font-mono bg-amber-200/80 px-1.5 py-0.5 rounded text-[9px] text-amber-950">
                                {msg.complaintId}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-charcoal whitespace-pre-wrap leading-relaxed font-medium">
                            {msg.text}
                          </p>
                          <div className="text-[9px] text-amber-800 font-semibold mt-2 text-right">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : isUser ? (
                        <div className="max-w-[85%] bg-charcoal text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm">
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          <div className="text-[9px] text-gray-400 mt-1 text-right">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[88%] bg-white text-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
                          {msg.isComplaint && (
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-red-600 tracking-wider mb-1">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Complaint Acknowledgment</span>
                            </div>
                          )}
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          <div className="text-[9px] text-gray-400 mt-1 flex items-center justify-between">
                            <span className="font-semibold text-bbBlue text-[9px]">BB Assistant</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-3 py-2 w-fit">
                    <Bot className="w-4 h-4 text-bbBlue animate-bounce" />
                    <span>Thinking in Hindi/English...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-gray-200 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowComplaintForm(true)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    title="Raise Complaint"
                  >
                    <ShieldAlert className="w-5 h-5" />
                  </button>

                  <input
                    ref={chatInputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Poochiye (Hindi/English) ya complaint likhein..."
                    className="flex-1 bg-gray-100 focus:bg-white border border-transparent focus:border-bbBlue rounded-xl px-3.5 py-2.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
                  />

                  <button
                    type="button"
                    disabled={!inputText.trim() || isLoading}
                    onClick={() => handleSendMessage()}
                    className="w-10 h-10 rounded-xl bg-charcoal hover:bg-black text-white flex items-center justify-center shadow transition-all disabled:opacity-30 cursor-pointer shrink-0"
                    aria-label="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
