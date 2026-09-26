import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { SupportChatMessage, SupportComplaint } from '../types/support';

/**
 * Real-time subscription to a user's persistent AI chatbot message history.
 * Chat messages are never deleted.
 */
export const subscribeToUserChat = (
  userId: string, 
  callback: (messages: SupportChatMessage[]) => void
): (() => void) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const messagesRef = collection(db, 'support_chats', userId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: SupportChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        sender: data.sender || 'user',
        text: data.text || '',
        timestamp: data.timestamp || Date.now(),
        isComplaint: !!data.isComplaint,
        complaintId: data.complaintId,
        isOfficialReply: !!data.isOfficialReply
      });
    });
    callback(list);
  }, (error) => {
    console.warn('[SupportService] Firestore subscription warning, fallback to cache:', error);
    // Return cached messages if offline
    try {
      const cached = localStorage.getItem(`bb_chat_history_${userId}`);
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch (e) {
      console.error(e);
    }
  });

  return unsubscribe;
};

/**
 * Saves a message into the user's permanent support chat collection
 */
export const saveChatMessage = async (
  userId: string, 
  message: Omit<SupportChatMessage, 'id'>
): Promise<SupportChatMessage> => {
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullMsg: SupportChatMessage = {
    id: msgId,
    ...message
  };

  try {
    const msgDocRef = doc(db, 'support_chats', userId, 'messages', msgId);
    await setDoc(msgDocRef, {
      id: msgId,
      sender: fullMsg.sender,
      text: fullMsg.text,
      timestamp: fullMsg.timestamp,
      isComplaint: !!fullMsg.isComplaint,
      complaintId: fullMsg.complaintId || null,
      isOfficialReply: !!fullMsg.isOfficialReply
    });
  } catch (err) {
    console.warn('[SupportService] Error writing to Firestore, persisting locally:', err);
  }

  // Also maintain client-side cache
  try {
    const cacheKey = `bb_chat_history_${userId}`;
    const raw = localStorage.getItem(cacheKey);
    const existing: SupportChatMessage[] = raw ? JSON.parse(raw) : [];
    existing.push(fullMsg);
    localStorage.setItem(cacheKey, JSON.stringify(existing));
  } catch (e) {
    console.error(e);
  }

  return fullMsg;
};

/**
 * Sends a prompt to the backend AI Assistant proxy endpoint (/api/ai/support-chat)
 */
export const sendAiChatQuery = async (
  message: string,
  history: SupportChatMessage[],
  user: { uid: string; email?: string; name?: string; role?: string },
  language: 'auto' | 'en' | 'hi' = 'auto'
): Promise<string> => {
  try {
    const response = await fetch('/api/ai/support-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.slice(-6).map(h => ({ sender: h.sender, text: h.text })),
        user,
        language
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data && data.reply) {
      return data.reply;
    }
    throw new Error('No reply in server response');
  } catch (err: any) {
    console.warn('[SupportService] AI Chat API request failed, using client fallback generator:', err.message);
    return getLocalAiFallbackResponse(message, user.role || 'customer', user.name || 'Friend');
  }
};

/**
 * Creates and registers an official Support Complaint in Firestore and in the user's Chat thread
 */
export const raiseComplaint = async (data: {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'customer' | 'partner';
  issueType: string;
  subject: string;
  description: string;
}): Promise<SupportComplaint> => {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const prefix = data.userRole === 'partner' ? 'PRT' : 'CST';
  const complaintId = `TKT-${prefix}-${randomSuffix}`;
  const now = new Date().toISOString();

  const newComplaint: SupportComplaint = {
    complaintId,
    userId: data.userId,
    userEmail: data.userEmail || '',
    userName: data.userName || 'Member',
    userRole: data.userRole,
    category: data.userRole, // customer or partner
    issueType: data.issueType,
    subject: data.subject || data.issueType,
    description: data.description,
    status: 'open',
    createdAt: now,
    updatedAt: now
  };

  // 1. Save to support_complaints collection
  try {
    const complaintRef = doc(db, 'support_complaints', complaintId);
    await setDoc(complaintRef, newComplaint);
  } catch (err) {
    console.error('[SupportService] Error saving complaint in Firestore:', err);
  }

  // 2. Add an official confirmation message into user's chat thread
  const confirmText = `🎫 **Complaint Registered Successfully!**\n\n` +
    `• **Ticket ID**: \`${complaintId}\`\n` +
    `• **Category**: ${data.userRole === 'partner' ? '💼 Partner Issue' : '👤 Customer Issue'}\n` +
    `• **Issue Type**: ${data.issueType}\n` +
    `• **Status**: 🟡 Open (Forwarded to Admin Team)\n\n` +
    `Aapki complaint direct BB Connect Admin Panel me forward kardi gayi hai. Admin iska review karke isi chat ke andar official reply bhejenge.`;

  await saveChatMessage(data.userId, {
    sender: 'ai',
    text: confirmText,
    timestamp: Date.now(),
    isComplaint: true,
    complaintId
  });

  return newComplaint;
};

/**
 * Real-time subscription to all complaints for the Admin Panel
 */
export const subscribeToAllComplaints = (
  callback: (complaints: SupportComplaint[]) => void
): (() => void) => {
  const complaintsRef = collection(db, 'support_complaints');
  const q = query(complaintsRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: SupportComplaint[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      list.push({
        id: docSnap.id,
        complaintId: data.complaintId || docSnap.id,
        userId: data.userId,
        userEmail: data.userEmail || '',
        userName: data.userName || 'Member',
        userRole: data.userRole || 'customer',
        category: data.category || data.userRole || 'customer',
        issueType: data.issueType || 'General Issue',
        subject: data.subject || '',
        description: data.description || '',
        status: data.status || 'open',
        adminReply: data.adminReply || '',
        repliedAt: data.repliedAt || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || ''
      });
    });
    callback(list);
  }, async (err) => {
    console.warn('[SupportService] Error in complaints subscription, fallback getDocs:', err);
    try {
      const snap = await getDocs(collection(db, 'support_complaints'));
      const fallbackList: SupportComplaint[] = [];
      snap.forEach(d => {
        const data = d.data() as any;
        fallbackList.push({
          id: d.id,
          complaintId: data.complaintId || d.id,
          userId: data.userId,
          userEmail: data.userEmail || '',
          userName: data.userName || 'Member',
          userRole: data.userRole || 'customer',
          category: data.category || data.userRole || 'customer',
          issueType: data.issueType || 'General Issue',
          subject: data.subject || '',
          description: data.description || '',
          status: data.status || 'open',
          adminReply: data.adminReply || '',
          repliedAt: data.repliedAt || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || ''
        });
      });
      callback(fallbackList);
    } catch (e) {
      console.error(e);
      callback([]);
    }
  });

  return unsubscribe;
};

/**
 * Admin Reply Function:
 * Updates the complaint status and immediately delivers the message into the user's chatbot thread.
 */
export const sendAdminComplaintReply = async (
  complaint: SupportComplaint,
  replyText: string,
  newStatus: 'in_progress' | 'resolved' = 'resolved'
): Promise<void> => {
  const now = new Date().toISOString();

  // 1. Update Complaint Document
  try {
    const complaintRef = doc(db, 'support_complaints', complaint.complaintId);
    await updateDoc(complaintRef, {
      adminReply: replyText,
      status: newStatus,
      repliedAt: now,
      updatedAt: now
    });
  } catch (err) {
    console.error('[SupportService] Error updating complaint doc:', err);
  }

  // 2. Send Official Admin Message directly into the user's Chat thread
  const adminMsgText = `👑 **OFFICIAL BB ADMIN REPLY**\n` +
    `Regarding Ticket: \`${complaint.complaintId}\`\n\n` +
    `${replyText}\n\n` +
    `📌 **Ticket Status Updated**: ${newStatus === 'resolved' ? '✅ Resolved' : '🔄 In Progress'}\n` +
    `_Admin Team, Barber & Beauty Connect_`;

  await saveChatMessage(complaint.userId, {
    sender: 'admin',
    text: adminMsgText,
    timestamp: Date.now(),
    isOfficialReply: true,
    complaintId: complaint.complaintId
  });
};

/**
 * Client-side robust fallback answer generator (Hindi & English)
 */
function getLocalAiFallbackResponse(query: string, role: string, name: string): string {
  const q = query.toLowerCase();

  // Slot booking query
  if (q.includes('slot') || q.includes('book') || q.includes('appointment') || q.includes('booking') || q.includes('salon')) {
    return `Namaste ${name}! 💈 **Slot Booking & Appointment Info**:\n\n` +
      `1. **Explore Salons/Barbers**: Aap homepage ya salons list se apni pasandeeda shop select karein.\n` +
      `2. **Worker & Slot Selection**: Apni timing aur worker chunein.\n` +
      `3. **5-Minute Escrow Security**: Booking karne par payment escrow me safe rehti hai. Partner ke paas 5 minutes ka time hota hai request accept karne ka.\n` +
      `4. **Auto-Refund Protection**: Agar partner 5 minute ke andar accept nahi karta ya reject karta hai, to aapka pura paisa turant aapke wallet ya payment source me wapas aa jata hai!\n\n` +
      `Agar aapko koi booking problem aa rahi hai, to aap yahan **"Raise Complaint"** par click karke ticket darj kar sakte hain.`;
  }

  // Payment / Refund query
  if (q.includes('payment') || q.includes('refund') || q.includes('paisa') || q.includes('kat gaya') || q.includes('wallet') || q.includes('money')) {
    return `Namaste ${name}! 💳 **Payment & Refund Support**:\n\n` +
      `• **100% Escrow Protected**: BB Connect par har payment appointment confirmation tak safe escrow me rehti hai.\n` +
      `• **Instant Refund**: Booking timeout (5 minutes) ya partner rejection par paisa turant refund ho jata hai.\n` +
      `• **Wallet Balance**: Customer dashboard me aap apna live wallet balance aur transactions check kar sakte hain.\n\n` +
      `Agar kisi transaction me payment debit hua hai par slot confirm nahi hua, to please apna Payment ID bata kar **Raise Complaint** karein, Admin turant verify karenge.`;
  }

  // Product / Shopping query
  if (q.includes('product') || q.includes('shop') || q.includes('order') || q.includes('delivery') || q.includes('saman') || q.includes('kharid')) {
    return `Namaste ${name}! 🛍️ **Product & Marketplace Help**:\n\n` +
      `• **Premium Essentials**: Aap platform ke "Shop" section (/shop) se authentic barber aur beauty salon products order kar sakte hain.\n` +
      `• **Order Tracking**: Apne order ka status aur delivery updates dekhne ke liye top bar me **"My Shopping"** (/my-shopping) par visit karein.\n\n` +
      `Kisi product ke delivery ya payment me issue ho to hume batayein, hum turant complaint register kar denge.`;
  }

  // Complaint query
  if (q.includes('complaint') || q.includes('shikayat') || q.includes('report') || q.includes('helpdesk') || q.includes('problem')) {
    return `Ji bilkul ${name}! Aapki pareshani ko solve karna hamari pehli priority hai.\n\n` +
      `Aap neeche diye gaye **"🚨 Raise Official Complaint"** button par click karein aur apni problem ka detail submit karein.\n\n` +
      `Hum aapko ek unique **Ticket ID** denge jo direct Admin Panel par jayegi, aur Admin team jald se jald isi chat ke andar aapko reply karegi!`;
  }

  // Partner specific query
  if (role === 'partner' || q.includes('partner') || q.includes('terminal') || q.includes('payout') || q.includes('shop')) {
    return `Namaste Partner ${name}! 💼 **Partner Terminal Assistance**:\n\n` +
      `• **Live Slots & Incoming Bookings**: Aapke Partner Terminal par naye slots aate hain, jinhe aapko 5 minute ke andar accept karna hota hai.\n` +
      `• **Staff & Services**: Apne workers aur rate list ko live manage kar sakte hain.\n` +
      `• **Payout Ledger**: Confirmed appointments ka balance escrow se aapke payout account me sync hota hai.\n\n` +
      `Kisi bhi payout ya terminal issue ke liye yahan se complaint raise karein.`;
  }

  // Default greeting / general
  return `Namaste ${name}! Main BB Connect ka Official AI Support Assistant hoon. 🤝\n\n` +
    `Main aapki in cheezon me madad kar sakta hoon:\n` +
    `• ✂️ **Slot Booking & 5-Min Escrow Details**\n` +
    `• 💳 **Payment, Wallet & Refund Status**\n` +
    `• 🛍️ **Product Orders & Delivery Tracking**\n` +
    `• 💼 **Partner Terminal & Payout Queries**\n` +
    `• 🚨 **Raise Official Complaint (Direct to Admin)**\n\n` +
    `Aap mujhse Hindi ya English dono me pooch sakte hain. Main aapki kya sahayata kar sakta hoon?`;
}
