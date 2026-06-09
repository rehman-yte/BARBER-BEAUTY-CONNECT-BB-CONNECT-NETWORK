import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { getBookings, submitRating } from "../services/logic_engine";
import RatingModal from "../components/RatingModal";

import { PersistenceService } from "../services/PersistenceService";
import { db } from "../lib/firebase";
import { doc, updateDoc, collection, query, where, onSnapshot, or, and } from "firebase/firestore";

interface BookingDetailsModalProps {
  booking: any;
  onClose: () => void;
  isEscrowVerified: (b: any) => boolean;
  isRejectFailed: (b: any) => boolean;
  onExpired?: (bookingId: string, transactionId: string, price: any) => void;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  onClose,
  isEscrowVerified,
  isRejectFailed,
  onExpired,
}) => {
  const isPendingEscrow = isEscrowVerified(booking);
  const failedOrRejected = isRejectFailed(booking);

  // Counter state for remaining seconds of 300s (5 minutes) window
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!isPendingEscrow || !booking.heldAt) return;

    let intervalId: any = null;

    const calculateSeconds = () => {
      const heldTime = new Date(booking.heldAt).getTime();
      const expirationTime = heldTime + 5 * 60 * 1000; // 5 minutes
      const remaining = Math.max(0, Math.floor((expirationTime - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        if (onExpired) {
          onExpired(booking.id, booking.transactionId, booking.price);
        }
      }
    };

    calculateSeconds();
    
    const heldTime = new Date(booking.heldAt).getTime();
    const expirationTime = heldTime + 5 * 60 * 1000;
    const initialRemaining = Math.max(0, Math.floor((expirationTime - Date.now()) / 1000));

    if (initialRemaining > 0) {
      intervalId = setInterval(calculateSeconds, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [booking, isPendingEscrow, onExpired]);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-charcoal/40 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col font-sans"
      >
        {/* Header Decoration */}
        <div
          className={`p-8 pb-4 text-white flex justify-between items-start relative ${
            failedOrRejected
              ? "bg-gradient-to-br from-red-500 to-red-600"
              : isPendingEscrow
                ? "bg-gradient-to-br from-bbBlue to-blue-700"
                : "bg-gradient-to-br from-green-500 to-emerald-600"
          }`}
        >
          <div>
            <span className="text-[0.5625rem] font-bold uppercase tracking-[0.3em] bg-white/20 px-2.5 py-1 rounded-full text-white/95">
              Secure Registry Details
            </span>
            <h3 className="text-[1.75rem] font-serif font-bold text-white mt-3 leading-tight">
              {booking.partnerBrandName || booking.shopName || "Studio Partner Network"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all border border-white/5 shadow-inner"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-6 flex-grow overflow-y-auto">
          {/* Main Highlights */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div>
              <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Service</p>
              <p className="text-[0.875rem] font-bold text-charcoal">
                {booking.serviceName || booking.service || "Premium Service"}
              </p>
            </div>
            <div>
              <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Amount Paid</p>
              <p className="text-[0.875rem] font-mono font-bold text-charcoal">₹{booking.amountPaid || booking.amount || booking.price || "0"}</p>
            </div>
          </div>

          {/* Reserved Execution Time */}
          <div className="space-y-1">
            <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Execution Schedule</p>
            <div className="flex items-center gap-3 bg-gray-50/50 px-4 py-3 rounded-2xl border border-gray-100">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div>
                <p className="text-[0.75rem] font-bold text-charcoal uppercase tracking-tighter">{booking.selectedDate || booking.date || "N/A"}</p>
                <p className="text-[0.6875rem] text-gray-500 font-medium">{booking.selectedSlot || booking.slotTime || booking.time || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Gateway Identification */}
          <div className="space-y-1">
            <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Authentication Gateway</p>
            <div className="bg-gray-50/50 px-4 py-3 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-wider">Gateway Identifier</p>
                <p className="text-[0.75rem] font-mono font-bold text-charcoal mt-0.5 truncate max-w-[200px]">
                  {booking.transactionId || booking.razorpayOrderId || "N/A - Direct Verification"}
                </p>
              </div>
              <span className="text-[0.5625rem] font-bold text-gray-400 bg-white px-2.5 py-1 border border-gray-100 rounded-md">
                RAZORPAY
              </span>
            </div>
          </div>

          {/* DYNAMIC SCENARIOS (ESCROW TIMERS & ERROR EXPLANATIONS) */}
          {isPendingEscrow && (
            <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl text-amber-900 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <div className="flex-grow">
                <p className="text-[0.5625rem] font-bold text-amber-700 uppercase tracking-widest">
                  Escrow Protection Timer
                </p>
                <p className="text-[0.8125rem] font-bold text-amber-900 mt-1">
                  Releasing in{" "}
                  <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">
                    {formatCountdown(secondsLeft)}
                  </span>
                </p>
                <p className="text-[0.625rem] text-amber-700 leading-relaxed mt-1.5">
                  After 5 minutes, money is auto-refunded to your original source of payment if the partner salon does
                  not manually approve of your selected time slot.
                </p>
              </div>
            </div>
          )}

          {failedOrRejected && (
            <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-red-900 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-grow">
                <p className="text-[0.5625rem] font-bold text-red-700 uppercase tracking-widest">
                  Rejection / Failure Diagnostics
                </p>
                <p className="text-[0.8125rem] font-semibold text-red-900 mt-1 leading-normal italic">
                  "{booking.message || booking.statusReason || "Partner Timeout Exception (Auto-Refund Triggered)"}"
                </p>
                <p className="text-[0.625rem] text-red-700 leading-relaxed mt-1.5">
                  The payment transaction was either abandoned, rejected by the partner, or the automatic escrow timers
                  timed out securely without approval.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-charcoal text-white hover:bg-charcoal/90 text-[0.6875rem] font-bold uppercase tracking-widest rounded-xl transition-all shadow-md"
          >
            Close Details
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>(PersistenceService.load("customer_bookings") || []);
  const [loading, setLoading] = useState(!PersistenceService.load("customer_bookings"));
  const [activeTab, setActiveTab] = useState<"approved" | "failed">("approved");
  const [pendingRatingBooking, setPendingRatingBooking] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // CRITICAL REDIRECT: Ensure partners never land on Customer Dashboard
  useEffect(() => {
    if (user && user.role === "partner") {
      console.log("[SECURITY] Partner detected on Customer Hub. Redirecting to Terminal...");
      navigate(user.onboardingComplete ? "/partner-dashboard" : "/onboarding", { replace: true });
    }
  }, [user, navigate]);

  // Visual Shield: If role is partner, don't even render the UI below
  if (user?.role === "partner") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
        <div className="w-16 h-16 border-4 border-bbBlue border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.5em]">
          Synchronizing Partner Terminal...
        </h2>
      </div>
    );
  }

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const q = query(
      collection(db, "bookings"),
      or(
        where("customerId", "==", user.uid),
        where("customer_id", "==", user.uid)
      )
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: any[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });

        // Sort data by createdAt (descending)
        data.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setBookings(data);
        setLoading(false);
        PersistenceService.save("customer_bookings", data);

        // Keep selected booking reference fresh so the pop-up modal persists updating states
        setSelectedBooking((prev: any) => {
          if (prev) {
            const updated = data.find((b) => b.id === prev.id);
            return updated || prev;
          }
          return prev;
        });

        // Priority: Check for completed bookings that need rating
        const needsRating = data.find((b: any) => b.status === "completed" && !b.rated);
        if (needsRating) {
          setPendingRatingBooking(needsRating);
        }
      },
      (error) => {
        console.warn("[Firestore Customer Dashboard error]:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const isBookingApproved = (b: any) => {
    if (!b) return false;
    const s = String(b.status || "").toLowerCase();
    return (
      s === "confirmed" ||
      s === "approved" ||
      s === "completed" ||
      b.partner_approval === true ||
      b.partnerApproved === true ||
      b.partner_approved === true
    );
  };

  const isEscrowVerified = (b: any) => {
    if (!b) return false;
    const s = String(b.status || "").toUpperCase();
    const ps = String(b.paymentStatus || b.payment_status || "").toUpperCase();
    const hasEscrowToken = !!(b.escrowToken || b.escrow_token);
    
    return (
      s === "PAYMENT_HELD" ||
      s === "HELD" ||
      s === "PENDING_APPROVAL" ||
      ps === "SUCCESS" ||
      ps === "PAID" ||
      hasEscrowToken
    );
  };

  const getBookingSecondsLeft = (b: any) => {
    const timeStr = b.heldAt || b.createdAt;
    if (!timeStr) return 0;
    const start = new Date(timeStr).getTime();
    const elapsed = Date.now() - start;
    return Math.max(0, 300 - Math.floor(elapsed / 1000));
  };

  const isBookingTimedOut = (b: any) => {
    const isApproved = isBookingApproved(b);
    if (isApproved) return false;
    
    if (!isEscrowVerified(b)) {
      const s = String(b.status || "").toUpperCase();
      const ps = String(b.paymentStatus || b.payment_status || "").toUpperCase();
      if (!(ps === "SUCCESS" || ps === "PAID" || s === "CONFIRMED" || s === "PENDING_APPROVAL" || b.partner_approved === false)) {
        return false;
      }
    }
    
    const secs = getBookingSecondsLeft(b);
    return secs <= 0;
  };

  const isRejectFailed = (b: any) => {
    if (!b) return false;
    if (isBookingApproved(b)) return false;
    if (isConfirmedTabWithoutFailureCheck(b)) return false;

    const s = String(b.status || "").toLowerCase();
    const ps = String(b.paymentStatus || b.payment_status || "").toLowerCase();
    
    // 1. Explicit failed/rejected/cancelled statuses
    if (
      s === "rejected" ||
      s === "failed" ||
      s === "cancelled" ||
      s === "refunded/failed" ||
      s === "rejected_timeout" ||
      s === "failed_timeout" ||
      ps === "failed" ||
      ps === "abandoned"
    ) {
      return true;
    }

    // 2. Initial order/slot states that were never paid
    if (s === "pending_payment" || b.bookingStatus === "pending_payment") {
      return true;
    }

    return false;
  };

  const isConfirmedTabWithoutFailureCheck = (b: any) => {
    const secsLeft = getBookingSecondsLeft(b);
    const isApproved = isBookingApproved(b);
    if (secsLeft <= 0 && !isApproved) return false;

    const s = String(b.status || "").toUpperCase();
    const ps = String(b.paymentStatus || b.payment_status || "").toUpperCase();
    const bs = String(b.bookingStatus || "").toUpperCase();

    // Check if customer matches active user to be extremely secure and precise
    const isCustomerMatch = b.customerId === user?.uid || b.customer_id === user?.uid;
    if (!isCustomerMatch) return false;

    return (
      ps === "SUCCESS" ||
      ps === "PAID" ||
      s === "CONFIRMED" ||
      s === "PAYMENT_HELD" ||
      s === "PENDING_APPROVAL" ||
      s === "PENDING_PARTNER_APPROVAL" ||
      bs === "PENDING_APPROVAL" ||
      bs === "PENDING_PARTNER_APPROVAL" ||
      bs === "PAYMENT_HELD" ||
      b.partner_approved === false ||
      b.partnerApproved === false ||
      isApproved ||
      isEscrowVerified(b)
    );
  };

  const isConfirmedTab = (b: any) => {
    const s = String(b.status || "").toUpperCase();
    const ps = String(b.paymentStatus || b.payment_status || "").toUpperCase();

    if (
      s === "REJECTED" ||
      s === "FAILED" ||
      s === "CANCELLED" ||
      s === "REFUNDED/FAILED" ||
      s === "REJECTED_TIMEOUT" ||
      s === "FAILED_TIMEOUT" ||
      ps === "FAILED" ||
      ps === "ABANDONED"
    ) {
      return false;
    }

    return isConfirmedTabWithoutFailureCheck(b);
  };

  const isFailedTab = (b: any) => {
    if (isConfirmedTab(b)) return false;
    return true;
  };

  const handleExpired = async (bookingId: string, transactionId: string, price: any) => {
    console.log(`[Auto-Refund Modal Trigger] Booking ${bookingId} has expired. Direct database and view update...`);
    
    // 1. Mutate local representation instantly to avoid timing lag
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: "failed_timeout",
          bookingStatus: 'failed',
          paymentStatus: 'failed',
          statusReason: 'Partner Response Timeout',
          message: 'Partner Response Timeout'
        };
      }
      return b;
    }));
    
    // If the selected booking is currently open, sync description immediately
    setSelectedBooking((prev: any) => {
      if (prev && prev.id === bookingId) {
        return {
          ...prev,
          status: "failed_timeout",
          bookingStatus: 'failed',
          paymentStatus: 'failed',
          statusReason: 'Partner Response Timeout',
          message: 'Partner Response Timeout'
        };
      }
      return prev;
    });

    // 2. Execute silent background fetch to initiate refund & update DB
    try {
      await fetch("/api/razorpay/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paymentId: transactionId,
          amount: price,
          bookingId: bookingId
        })
      });
    } catch (err) {
      console.error("[Silent Auto-Refund Error]:", err);
    }

    // 3. Direct Firestore document backup write
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: "failed_timeout",
        bookingStatus: 'failed',
        paymentStatus: 'failed',
        statusReason: 'Partner Response Timeout',
        message: 'Partner Response Timeout'
      });
    } catch (dbErr) {
      console.error("[Silent DB Mutate Error]:", dbErr);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);

      // Check for timeout events in real-time
      bookings.forEach(async (booking) => {
        const isApproved = isBookingApproved(booking);
        const isPending = isConfirmedTab(booking) && !isApproved;
        if (isPending) {
          const secs = getBookingSecondsLeft(booking);
          if (secs <= 0) {
            console.log(`[Real-time escalation] Booking ${booking.id} timed out. Auto-escalating.`);
            await handleExpired(
              booking.id,
              booking.transactionId || booking.id,
              booking.amountPaid || booking.amount || booking.price || 0
            );
          }
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [bookings]);

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "failed") return isFailedTab(b);
    return isConfirmedTab(b);
  });

  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!pendingRatingBooking) return;
    try {
      await submitRating(
        pendingRatingBooking.id,
        pendingRatingBooking.partnerId || pendingRatingBooking.shopId,
        rating,
        comment,
      );
      setPendingRatingBooking(null);
    } catch (error) {
      console.error("Failed to submit rating:", error);
    }
  };

  const stats = {
    approved: bookings.filter(isConfirmedTab).length,
    failed: bookings.filter(isFailedTab).length,
  };

  // Sync with actual details
  const displayName = user?.name || "Valued User";
  const photoURL = user?.photoURL;

  return (
    <div className="pt-[8rem] pb-[5rem] bg-white min-h-screen">
      <div className="max-w-[1440px] mx-auto px-[5%]">
        {/* 1. HEADER / IDENTITY */}
        <header className="mb-[4rem] flex flex-col md:flex-row items-center gap-[2.5rem] bg-gray-50/50 p-[2.5rem] rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="relative">
            <div className="w-[8rem] h-[8rem] rounded-full overflow-hidden border-4 border-white shadow-xl bg-white">
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-bbBlue flex items-center justify-center text-white text-[2.5rem] font-serif font-bold">
                  {displayName?.[0] || "U"}
                </div>
              )}
            </div>
            <div className="absolute bottom-[0.25rem] right-[0.25rem] w-[2rem] h-[2rem] bg-bbBlue text-white rounded-full flex items-center justify-center shadow-lg border border-white">
              <svg className="w-[1rem] h-[1rem]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </div>
          </div>

          <div className="flex-grow text-center md:text-left">
            <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.5em] mb-[0.5rem]">
              {user?.role || "Guest"} Hub
            </p>
            <h2 className="text-[2.25rem] font-serif font-black text-charcoal leading-none mb-[0.75rem]">
              {displayName}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-[1.5rem]">
              <span className="text-[0.5625rem] px-[0.75rem] py-[0.25rem] bg-gray-100 rounded-full font-bold text-gray-400 tracking-[0.15em] uppercase">
                REGISTRY ID: {user?.uid?.slice(-8) || "N/A"}
              </span>
              <button
                onClick={() => navigate("/shops")}
                className="text-[0.5625rem] font-bold text-bbBlue uppercase tracking-[0.2em] hover:opacity-80 transition-all flex items-center gap-[0.5rem] py-[0.25rem]"
              >
                My Bookings
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-[2.5rem] bg-white p-[2rem] rounded-[2rem] border border-gray-100 shadow-inner">
            <div className="text-center">
              <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.25rem]">
                Total Bookings
              </p>
              <p className="text-[1.875rem] font-serif font-bold text-bbBlue">{bookings.length}</p>
            </div>
          </div>
        </header>

        {/* 2. ESCROW & STATUS TABS */}
        <div className="flex border-b border-gray-100 mb-[3rem] overflow-x-auto scrollbar-hide bg-white sticky top-[5rem] z-20 py-[0.5rem]">
          {[
            {
              key: "approved",
              label: "Confirmed",
              count: stats.approved,
              color: "text-green-600",
              activeBg: "bg-green-600",
            },
            {
              key: "failed",
              label: "REJECT/FAILED",
              count: stats.failed,
              color: "text-red-500",
              activeBg: "bg-red-500",
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`relative px-[3rem] py-[1.5rem] text-[0.6875rem] font-bold uppercase tracking-[0.25em] transition-all whitespace-nowrap flex items-center gap-[1rem] ${
                activeTab === tab.key ? tab.color : "text-gray-300 hover:text-charcoal"
              }`}
            >
              {tab.label}
              <span
                className={`text-[0.5625rem] px-[0.625rem] py-[0.125rem] rounded-md font-sans ${activeTab === tab.key ? tab.activeBg + " text-white" : "bg-gray-100 text-gray-400"}`}
              >
                {tab.count}
              </span>
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTabLine"
                  className={`absolute bottom-0 left-0 right-0 h-[0.375rem] ${tab.activeBg} rounded-t-full`}
                />
              )}
            </button>
          ))}
        </div>

        {/* 3. LISTING AREA (LINEAR SINGLE-ROW ARCHITECTURE) */}
        <div className="w-full bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
          {/* Table Header Row (Desktop Only) */}
          <div className="hidden md:grid grid-cols-[1.2fr_2fr_1fr_2fr_1.2fr] gap-4 p-6 bg-gray-50/50 border-b border-gray-100 text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">
            <div>ID Token</div>
            <div>Service / Studio Partner</div>
            <div>Amount Paid</div>
            <div>Target Timestamp</div>
            <div className="text-right">Execution Status</div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <div className="py-[10rem] flex flex-col items-center justify-center gap-[1.5rem]">
                <div className="w-[3rem] h-[3rem] border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.4em]">
                  Connecting to Registry...
                </p>
              </div>
            ) : filteredBookings.length > 0 ? (
              <div className="divide-y divide-gray-100/70">
                {filteredBookings.map((booking) => {
                  const failedOrRejected = isFailedTab(booking);
                  const isApproved = isBookingApproved(booking) || booking.partner_approved === true || booking.partnerApproved === true;
                  const secsLeft = getBookingSecondsLeft(booking);
                  const isPending = isConfirmedTab(booking) && !isApproved;

                  const formatCountdown = (secs: number) => {
                    const mins = Math.floor(secs / 60);
                    const s = secs % 60;
                    return `${mins}:${s < 10 ? "0" : ""}${s}s`;
                  };

                  return (
                    <motion.div
                      key={booking.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      onClick={() => setSelectedBooking(booking)}
                      className={`flex flex-col md:grid md:grid-cols-[1.2fr_2fr_1fr_2fr_1.2fr] gap-3 md:gap-4 p-5 md:p-6 cursor-pointer transition-all duration-300 items-start md:items-center font-sans ${
                        failedOrRejected
                          ? "text-charcoal border-b border-gray-100 hover:bg-gray-50/40"
                          : isPending
                            ? "text-red-600 bg-red-50 hover:bg-red-100/50 border border-red-300"
                            : "text-green-600 bg-green-50 hover:bg-green-100/50 border border-green-200"
                      }`}
                    >
                      {/* COL 1: ID Token & Shop */}
                      <div className="flex items-center justify-between w-full md:w-auto md:block">
                        <span className={`text-[0.6875rem] font-mono font-bold tracking-wider px-2.5 py-1 md:px-0 md:py-0 rounded flex items-center gap-1.5 ${
                          failedOrRejected ? "text-charcoal bg-gray-50 md:bg-transparent" : isPending ? "text-red-600" : "text-green-600"
                        }`}>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              failedOrRejected ? "bg-red-500" : isPending ? "bg-red-500 animate-pulse" : "bg-green-500"
                            }`}
                          />
                          {failedOrRejected ? "ABND-" : "TRX-"}
                          {String(booking.id || booking._id || "").slice(-8).toUpperCase()}
                        </span>
                        <span className={`text-[0.5625rem] font-bold uppercase tracking-wider md:hidden ${
                          failedOrRejected ? "text-gray-400" : isPending ? "text-red-500" : "text-green-600"
                        }`}>
                          {booking.partnerBrandName || booking.shopName || "Partner"}
                        </span>
                      </div>

                      {/* COL 2: Service & Shop */}
                      <div className="w-full md:w-auto">
                        <p className={`text-[0.8125rem] font-bold leading-tight ${
                          failedOrRejected ? "text-charcoal" : isPending ? "text-red-600" : "text-green-600"
                        }`}>
                          {booking.serviceName || booking.service || "Grooming Service"}
                        </p>
                        <p className={`hidden md:block text-[0.5625rem] uppercase tracking-wider font-semibold mt-0.5 ${
                          failedOrRejected ? "text-gray-400" : isPending ? "text-red-500" : "text-green-600"
                        }`}>
                          {booking.partnerBrandName || booking.shopName || "Studio Partner"}
                        </p>
                      </div>

                      {/* COL 3: Amount Paid */}
                      <div className="flex items-center justify-between w-full md:w-auto md:block pt-1 md:pt-0 border-t border-dashed border-gray-100 md:border-none">
                        <span className={`md:hidden text-[0.5625rem] font-bold uppercase tracking-widest ${
                          failedOrRejected ? "text-gray-400" : isPending ? "text-red-400" : "text-green-500"
                        }`}>
                          Amount
                        </span>
                        <span className={`text-[0.8125rem] font-mono font-bold ${
                          failedOrRejected ? "text-charcoal" : isPending ? "text-red-600" : "text-green-600"
                        }`}>
                          ₹{booking.amountPaid || booking.amount || booking.price || "0"}
                        </span>
                      </div>

                      {/* COL 4: Target Execution Timestamp */}
                      <div className="flex items-center justify-between w-full md:w-auto md:block pt-1 md:pt-0">
                        <span className={`md:hidden text-[0.5625rem] font-bold uppercase tracking-widest ${
                          failedOrRejected ? "text-gray-400" : isPending ? "text-red-400" : "text-green-500"
                        }`}>
                          Execution Time
                        </span>
                        <div className="text-right md:text-left">
                          <p className={`text-[0.75rem] font-bold ${
                            failedOrRejected ? "text-charcoal" : isPending ? "text-red-600" : "text-green-600"
                          }`}>
                            {booking.selectedDate || booking.date || "N/A"}
                          </p>
                          <p className={`text-[0.625rem] font-medium md:mt-0.5 ${
                            failedOrRejected ? "text-gray-400" : isPending ? "text-red-500" : "text-green-600"
                          }`}>
                            {booking.selectedSlot || booking.slotTime || booking.time || "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* COL 5: Stylized Badge */}
                      <div className="flex items-center justify-between w-full md:w-auto md:justify-end pt-2 md:pt-0">
                        <span className={`md:hidden text-[0.5625rem] font-bold uppercase tracking-widest ${
                          failedOrRejected ? "text-gray-400" : isPending ? "text-red-400" : "text-green-500"
                        }`}>
                          Status
                        </span>
                        <span
                          className={`text-[0.5625rem] font-bold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border ${
                            failedOrRejected
                              ? "bg-red-50 border-red-100 text-red-600"
                              : isPending
                                ? "bg-red-50 border-red-300 text-red-600 animate-pulse"
                                : "bg-green-50 border-green-200 text-green-600"
                          }`}
                        >
                          {failedOrRejected
                            ? "REJECT/FAILED"
                            : isPending
                              ? `PENDING APPROVAL (${formatCountdown(secsLeft)})`
                              : "CONFIRMED"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-[12rem] flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[2rem] m-6 bg-gray-50/20"
              >
                <div className="w-[6rem] h-[6rem] bg-white rounded-full flex items-center justify-center mb-[2rem] shadow-xl border border-gray-100">
                  <svg className="w-[2.5rem] h-[2.5rem] text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h4 className="text-[0.6875rem] font-bold text-gray-400 uppercase tracking-[0.5em] mb-[1rem]">
                  No Records Found
                </h4>
                <p className="text-[0.625rem] text-gray-300 font-medium uppercase tracking-[0.2em] max-w-[20rem] text-center leading-relaxed">
                  Transactions appear here after secure payment initiation.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Details Interactive Pop-Up Modal Overlay */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            isEscrowVerified={isEscrowVerified}
            isRejectFailed={isRejectFailed}
            onExpired={handleExpired}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRatingBooking && (
          <RatingModal
            booking={pendingRatingBooking}
            onSubmit={handleRatingSubmit}
            onClose={() => setPendingRatingBooking(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerDashboard;
