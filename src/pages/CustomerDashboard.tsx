import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { getBookings, submitRating } from "../services/logic_engine";
import RatingModal from "../components/RatingModal";

import { PersistenceService } from "../services/PersistenceService";
import { db } from "../lib/firebase";
import { CustomerWalletHeaderWidget } from "../components/CustomerWalletHeaderWidget";
import { doc, updateDoc, collection, query, where, onSnapshot, or, and, getDoc, addDoc, serverTimestamp, runTransaction } from "firebase/firestore";

const parseDateToMillis = (val: any): number => {
  if (!val) return Date.now(); // Graceful fallback for local serverTimestamp synchronization latency
  const targetTime = val?.seconds ? val.seconds * 1000 : (typeof val.toDate === "function" ? val.toDate().getTime() : new Date(val).getTime());
  return isNaN(targetTime) ? Date.now() : targetTime;
};

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
      const heldTime = parseDateToMillis(booking.heldAt);
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
    
    const heldTime = parseDateToMillis(booking.heldAt);
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
                <p className="text-[0.625rem] text-amber-700 leading-relaxed mt-1.5 font-bold">
                  Please wait 5 minutes for partner verification.
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
                <p className="text-[0.625rem] text-red-700 leading-relaxed mt-1.5 font-bold">
                  Your payment will be refunded within 10-20 minutes.
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

interface FailedBookingDetailsModalProps {
  booking: any;
  onClose: () => void;
}

const FailedBookingDetailsModal: React.FC<FailedBookingDetailsModalProps> = ({ booking, onClose }) => {
  const failureReason = booking.failure_reason || booking.reject_reason || booking.statusReason || booking.message || "Timeout: Partner did not accept within 5 minutes";
  const refundStatus = booking.refund_status || "Payment Refund Initiated";
  const timeframe = booking.refund_timeframe || "12 Hours (Amount will be credited back to your original payment method safely)";

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
        className="bg-white rounded-[2.5rem] border border-red-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col font-sans"
      >
        {/* Header */}
        <div className="p-8 pb-4 text-white bg-gradient-to-br from-red-500 to-red-600 flex justify-between items-start relative">
          <div>
            <span className="text-[0.5625rem] font-bold uppercase tracking-[0.3em] bg-white/20 px-2.5 py-1 rounded-full text-white/95">
              Refund & Failure Registry
            </span>
            <h3 className="text-[1.75rem] font-serif font-bold text-white mt-3 leading-tight">
              {booking.partnerBrandName || booking.shopName || "Partner Studio"}
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

        {/* Content */}
        <div className="p-8 space-y-6 flex-grow overflow-y-auto">
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
            <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Original Schedule</p>
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

          {/* Failure Details */}
          <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-red-900 space-y-4">
            <div>
              <p className="text-[0.5625rem] font-bold text-red-700 uppercase tracking-widest">
                Reason for Failure
              </p>
              <p className="text-[0.8125rem] font-semibold text-red-900 mt-1 leading-normal italic">
                "{failureReason}"
              </p>
            </div>

            <div className="border-t border-red-200/50 pt-3">
              <p className="text-[0.5625rem] font-bold text-red-700 uppercase tracking-widest">
                Refund Status
              </p>
              <div className="flex items-center gap-2 mt-1.5 font-bold text-green-700">
                <svg className="w-4 h-4 shrink-0 animate-pulse text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-[0.8125rem] uppercase tracking-wider">{refundStatus}</span>
              </div>
            </div>

            <div className="border-t border-red-200/50 pt-3">
              <p className="text-[0.5625rem] font-bold text-red-700 uppercase tracking-widest">
                Estimated Timeframe
              </p>
              <p className="text-[0.75rem] font-medium text-red-800 leading-relaxed mt-1">
                {timeframe}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-charcoal text-white hover:bg-charcoal/90 text-[0.6875rem] font-bold uppercase tracking-widest rounded-xl transition-all shadow-md"
          >
            Close Diagnostics
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface SelectedSlotDetailsModalProps {
  item: any;
  onClose: () => void;
}

const SelectedSlotDetailsModal: React.FC<SelectedSlotDetailsModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const shopName = item.partnerBrandName || item.shopName || item.partnerBrand || item.studioName || "Partner Studio";
  const serviceName = item.serviceName || item.service || "Premium Service";
  const pricePaid = item.amountPaid || item.price || item.amount || "0";
  const timeWindow = item.selectedSlot || item.timeSlot || item.slotTime || item.time || "N/A";
  const bookingDate = item.selectedDate || item.date || "";

  // Chronological Status Check: Compare item.date (bookingDate) with today's calendar date
  let dateStatusText = "Upcoming Day's Slot";
  if (bookingDate) {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

    const normalizedBookingDate = String(bookingDate).toLowerCase().trim();
    
    let isSameDay = false;
    try {
      const bDateObj = new Date(bookingDate);
      if (!isNaN(bDateObj.getTime())) {
        isSameDay = (
          bDateObj.getFullYear() === today.getFullYear() &&
          bDateObj.getMonth() === today.getMonth() &&
          bDateObj.getDate() === today.getDate()
        );
      }
    } catch (e) {}

    if (normalizedBookingDate === todayStr || normalizedBookingDate.includes(todayStr) || isSameDay) {
      dateStatusText = "Today's Slot";
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-charcoal/40 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-charcoal"
      id="selected-slot-modal-backdrop"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
        id="selected-slot-modal"
      >
        {/* Header with resilient inline gradient definition */}
        <div 
          className="p-8 pb-4 text-white flex justify-between items-start relative bg-gradient-to-br from-blue-600 to-indigo-900"
          style={{ background: "linear-gradient(135deg, #2a7de1 0%, #1d4ed8 100%)" }}
        >
          <div>
            <span className="text-[0.5625rem] font-bold uppercase tracking-[0.3em] bg-white/20 px-2.5 py-1 rounded-full text-white/95">
              Slot Execution Details
            </span>
            <h3 className="text-[1.75rem] font-serif font-bold text-white mt-3 leading-tight" id="modal-shop-name">
              {shopName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all border border-white/5 shadow-inner"
            id="close-slot-modal-btn-top"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 flex-grow overflow-y-auto">
          {/* Service & Price */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div>
              <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Service</p>
              <p className="text-[0.875rem] font-bold text-charcoal">
                {serviceName}
              </p>
            </div>
            <div>
              <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Amount Paid</p>
              <p className="text-[0.875rem] font-mono font-bold text-charcoal">₹{pricePaid}</p>
            </div>
          </div>

          {/* Time & Chronology */}
          <div className="space-y-4">
            <div>
              <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Timeline Category</p>
              <p className="text-[0.875rem] font-bold text-bbBlue uppercase tracking-tighter">{dateStatusText}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Reserved Schedule</p>
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
                  <p className="text-[0.75rem] font-bold text-charcoal uppercase tracking-tighter">{bookingDate}</p>
                  <p className="text-[0.6875rem] text-gray-500 font-medium">{timeWindow}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-charcoal text-white hover:bg-charcoal/90 text-[0.6875rem] font-bold uppercase tracking-widest rounded-xl transition-all shadow-md"
            id="close-slot-modal-btn-bottom"
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
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"waiting" | "confirmed" | "failed">("waiting");
  const [pendingRatingBooking, setPendingRatingBooking] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedFailedBooking, setSelectedFailedBooking] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // ID-ISOLATED 3-TAB PIPELINE STATE ARRAYS
  const [waitingBookings, setWaitingBookings] = useState<any[]>([]);
  const [confirmedBookings, setConfirmedBookings] = useState<any[]>([]);
  const [failedBookings, setFailedBookings] = useState<any[]>([]);

  // Success Popup control states
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [popupData, setPopupData] = useState<any>(null);

  // Post-payment interception and success popup controller
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentParam = searchParams.get("payment");
    const bookingIdParam = searchParams.get("bookingId");

    if (paymentParam === "success" && bookingIdParam) {
      const fetchDirectDoc = async () => {
        try {
          const docRef = doc(db, "bookings", bookingIdParam);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const serviceName = data.serviceName || data.service || "Grooming Service";
            const amountPaid = data.amountPaid || data.amount || data.price || "0";
            const selectedDate = data.selectedDate || data.date || "N/A";
            const selectedSlot = data.selectedSlot || data.slotTime || data.time || "N/A";

            const normalizedBooking = {
              id: docSnap.id,
              ...data,
              serviceName,
              amountPaid,
              selectedDate,
              selectedSlot
            };

            setPopupData(normalizedBooking);
            setShowSuccessPopup(true);

            // Once the popup closes, cleanly map the fetched booking row into local component states backing the respective live tabs
            setBookings((prev) => {
              if (prev.some((b) => b.id === normalizedBooking.id)) {
                return prev.map((b) => b.id === normalizedBooking.id ? normalizedBooking : b);
              }
              const next = [normalizedBooking, ...prev];
              const split = splitBookingsIntoTabs(next);
              setWaitingBookings(split.waiting);
              setConfirmedBookings(split.confirmed);
              setFailedBookings(split.failed);
              return next;
            });

            setTimeout(() => {
              setShowSuccessPopup(false);
            }, 4000);
          }
        } catch (error) {
          console.error("Direct fetch error for status popup:", error);
        }
      };

      fetchDirectDoc();

      // Clean query parameters so refresh doesn't trigger the modal again
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [navigate]);

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

  // Time Countdown Helper with full Timestamp checks
  const getBookingSecondsLeft = (b: any) => {
    const timeStr = b.heldAt || b.createdAt;
    const start = parseDateToMillis(timeStr);
    const elapsed = Date.now() - start;
    return Math.max(0, 300 - Math.floor(elapsed / 1000));
  };

  // Convert/Normalize string statuses
  const getNormalizedPaymentStatus = (b: any): string => {
    if (!b) return "";
    const pStatus = String(b.paymentStatus || b.payment_status || "").trim().toUpperCase();
    if (pStatus === "SUCCESS" || pStatus === "PAID" || pStatus === "TRUE") {
      return "SUCCESS";
    }
    return pStatus;
  };

  const isBookingApproved = (b: any) => {
    if (!b) return false;
    const s = String(b.status || "").toLowerCase();
    const bs = String(b.bookingStatus || "").toLowerCase();
    return (
      s === "confirmed" ||
      s === "approved" ||
      s === "completed" ||
      s === "accepted" ||
      bs === "confirmed" ||
      bs === "approved" ||
      bs === "completed" ||
      bs === "accepted" ||
      b.partner_accepted === true ||
      b.partner_approval === true ||
      b.partnerApproved === true ||
      b.partner_approved === true
    );
  };

  const isBookingRejected = (b: any) => {
    if (!b) return false;
    const s = String(b.status || "").toLowerCase();
    const bs = String(b.bookingStatus || "").toLowerCase();
    const ps = String(b.paymentStatus || b.payment_status || "").toLowerCase();
    return (
      s === "rejected" ||
      s === "failed" ||
      s === "cancelled" ||
      s === "refunded/failed" ||
      s === "rejected_timeout" ||
      s === "failed_timeout" ||
      bs === "failed" ||
      bs === "rejected" ||
      b.partner_rejected === true ||
      b.partnerRejected === true ||
      ps === "failed"
    );
  };

  const isWaitingBooking = (b: any) => {
    if (!b) return false;
    const isPaid = getNormalizedPaymentStatus(b) === "SUCCESS";
    if (!isPaid) return false;
    if (isBookingApproved(b)) return false;
    if (isBookingRejected(b)) return false;
    const secsLeft = getBookingSecondsLeft(b);
    return secsLeft > 0;
  };

  const isConfirmedBooking = (b: any) => {
    if (!b) return false;
    const isPaid = getNormalizedPaymentStatus(b) === "SUCCESS";
    if (!isPaid) return false;
    return isBookingApproved(b);
  };

  const isFailedBooking = (b: any) => {
    if (!b) return false;
    const isPaid = getNormalizedPaymentStatus(b) === "SUCCESS";
    if (!isPaid) return false;
    if (isBookingApproved(b)) return false;
    const secsLeft = getBookingSecondsLeft(b);
    return isBookingRejected(b) || secsLeft <= 0;
  };

  const isEscrowVerified = (b: any) => isWaitingBooking(b);
  const isRejectFailed = (b: any) => isFailedBooking(b);

  // Tab Separator Helper
  const splitBookingsIntoTabs = (rawList: any[]) => {
    const waiting: any[] = [];
    const confirmed: any[] = [];
    const failed: any[] = [];
    const seenIds = new Set<string>();

    rawList.forEach((b) => {
      if (!b || !b.id || seenIds.has(b.id)) return;
      seenIds.add(b.id);

      const isPaid = getNormalizedPaymentStatus(b) === "SUCCESS";
      if (!isPaid) return; // Drop list item if unpaid, incomplete, or invalid

      const statusVal = String(b.status || b.bookingStatus || "").toLowerCase();

      if (statusVal === "pending" || statusVal === "payment_held") {
        waiting.push(b);
      } else if (statusVal === "confirmed" || statusVal === "accepted" || statusVal === "approved" || statusVal === "completed" || isBookingApproved(b)) {
        confirmed.push(b);
      } else {
        const baseMsg = b.message || b.statusReason || b.failure_reason || "Timeout: Partner did not accept within 5 minutes";
        const cleanMsg = baseMsg.includes("Your payment will be refunded") 
          ? baseMsg 
          : `${baseMsg}. Your payment will be refunded within 10-20 minutes.`;

        failed.push({
          ...b,
          message: cleanMsg,
          statusReason: cleanMsg
        });
      }
    });

    return { waiting, confirmed, failed };
  };

  // 1. FORCE USER-IDENTITY RELATIONAL FIREBASE QUERY
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const currentUser = user;

    // Query structure optimization to load only self-owned records
    const secureCustomerQuery = query(
      collection(db, 'bookings'),
      where('customerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      secureCustomerQuery,
      (snapshot) => {
        const rawList: any[] = [];
        const seenIds = new Set<string>();
        
        snapshot.forEach((doc) => {
          const docData = doc.data();
          const bookingId = doc.id;
          
          if (seenIds.has(bookingId)) {
            return;
          }
          seenIds.add(bookingId);
          
          // ABSOLUTE CUSTOMER IDENTITY LOCK: strictly block and ignore matches outside this unique user session
          const bookingCustId = docData.customerId || docData.customer_id;
          if (bookingCustId !== currentUser.uid) {
            return;
          }

          // Normalize service fields
          const serviceName = docData.serviceName || docData.service || "Grooming Service";
          const amountPaid = docData.amountPaid || docData.amount || docData.price || "0";
          const selectedDate = docData.selectedDate || docData.date || "N/A";
          const selectedSlot = docData.selectedSlot || docData.slotTime || docData.time || "N/A";

          const isPaid = getNormalizedPaymentStatus(docData) === "SUCCESS";

          if (isPaid) {
            rawList.push({
              id: bookingId,
              ...docData,
              customerId: docData.customerId || currentUser.uid,
              customerName: docData.customerName || currentUser.displayName || "Client Account",
              payment_status: "prepaid",
              routing_system: "direct_split_route",
              admin_cut_ratio: 0.05,
              partner_cut_ratio: 0.95,
              serviceName,
              amountPaid,
              selectedDate,
              selectedSlot,
              paymentStatus: "SUCCESS"
            });
          }
        });

        // Sort overall list by newest first
        rawList.sort((a, b) => {
          const dateA = a.createdAt ? parseDateToMillis(a.createdAt) : 0;
          const dateB = b.createdAt ? parseDateToMillis(b.createdAt) : 0;
          return dateB - dateA;
        });

        setBookings(rawList);
        PersistenceService.save(`customer_bookings_${user.uid}`, rawList);

        // Clear previous state matrices & cleanly sort every document into its respective state array in real-time strictly on status
        const waitingBookings: any[] = [];
        const confirmedBookings: any[] = [];
        const rejectFailedBookings: any[] = [];
        const seenIdsInTabs = new Set<string>();

        rawList.forEach((b) => {
          if (seenIdsInTabs.has(b.id)) return;
          seenIdsInTabs.add(b.id);

          const statusVal = String(b.status || b.bookingStatus || "").toLowerCase();
          
          if (statusVal === "pending" || statusVal === "payment_held") {
            // Check countdown timer
            const secsLeft = getBookingSecondsLeft(b);
            if (secsLeft <= 0) {
              rejectFailedBookings.push(b);
              handleExpired(
                b.id,
                b.transactionId || b.id,
                b.amountPaid || b.amount || b.price || 0
              );
            } else {
              waitingBookings.push(b);
            }
          } else if (statusVal === "confirmed" || statusVal === "accepted" || statusVal === "approved" || statusVal === "completed" || isBookingApproved(b)) {
            confirmedBookings.push(b);
          } else {
            rejectFailedBookings.push(b);
          }
        });

        setWaitingBookings(waitingBookings);
        setConfirmedBookings(confirmedBookings);
        setFailedBookings(rejectFailedBookings);

        setLoading(false);

        // Keep selected booking reference fresh so modals update live
        setSelectedBooking((prev: any) => {
          if (prev) {
            const updated = rawList.find((b) => b.id === prev.id);
            return updated || prev;
          }
          return prev;
        });

        // Priority rating reminder
        const needsRating = rawList.find((b: any) => b.status === "completed" && !b.rated && b.review_submitted !== true);
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

  // Sync state arrays with storage on initial load
  useEffect(() => {
    if (!user) return;
    const cachedKey = `customer_bookings_${user.uid}`;
    const cached = PersistenceService.load(cachedKey) || [];
    if (cached.length > 0) {
      setBookings(cached);
      const split = splitBookingsIntoTabs(cached);
      setWaitingBookings(split.waiting);
      setConfirmedBookings(split.confirmed);
      setFailedBookings(split.failed);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [user]);

  const handleExpired = async (bookingId: string, transactionId: string, price: any) => {
    console.log(`[Auto-Refund Trigger] Booking ${bookingId} has expired. evicting from waiting list...`);
    
    // Direct local eviction & reassignment to failed list to skip Firestore delay
    setWaitingBookings((prev) => prev.filter((item) => item.id !== bookingId));
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            status: "failed_timeout",
            bookingStatus: "failed_timeout",
            paymentStatus: "failed_timeout",
            statusReason: "Timeout: Partner did not accept within 5 minutes",
            message: "Timeout: Partner did not accept within 5 minutes",
            refund_status: "initiated",
            refund_timeframe: "12 hours",
            failure_reason: "Timeout: Partner did not accept within 5 minutes"
          };
        }
        return b;
      })
    );

    // If active pop-up modal is opened, sync live
    setSelectedBooking((prev: any) => {
      if (prev && prev.id === bookingId) {
        return {
          ...prev,
          status: "failed_timeout",
          bookingStatus: "failed_timeout",
          paymentStatus: "failed_timeout",
          statusReason: "Timeout: Partner did not accept within 5 minutes",
          message: "Timeout: Partner did not accept within 5 minutes",
          refund_status: "initiated",
          refund_timeframe: "12 hours",
          failure_reason: "Timeout: Partner did not accept within 5 minutes"
        };
      }
      return prev;
    });

    // 1. Trigger background refund endpoint call
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

    // 2. Direct background database update
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "failed_timeout",
        failure_reason: "Timeout: Partner did not accept within 5 minutes",
        refund_status: "initiated"
      });
    } catch (dbErr) {
      console.error("[Silent DB Mutate Error]:", dbErr);
    }
  };

  // 2. HIGH-PRECISION COUNTDOWN TICKING AND REAL-TIME DELETION & MOVEMENT HOOKS
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);

      setWaitingBookings((prevWaiting) => {
        const nextWaiting: any[] = [];
        prevWaiting.forEach((b) => {
          const statusVal = String(b.status || b.bookingStatus || "").toLowerCase();
          
          // Guard: If status has migrated from waiting, evict/unmount instantly
          if (statusVal !== "pending" && statusVal !== "payment_held") {
            return;
          }

          const secs = getBookingSecondsLeft(b);
          if (secs <= 0) {
            console.log(`[Timer Timeout Event] Evicting booking ${b.id}`);
            
            // Execute refund logic
            handleExpired(
              b.id,
              b.transactionId || b.id,
              b.amountPaid || b.amount || b.price || 0
            );

            // Evict and move to failed states locally
            const failedCopy = {
              ...b,
              status: "failed_timeout",
              bookingStatus: "failed_timeout",
              paymentStatus: "failed_timeout",
              statusReason: "Timeout: Partner did not accept within 5 minutes",
              message: "Timeout: Partner did not accept within 5 minutes",
              refund_status: "initiated",
              refund_timeframe: "12 hours",
              failure_reason: "Timeout: Partner did not accept within 5 minutes"
            };

            setFailedBookings((prevFailed) => {
              if (prevFailed.some((item) => item.id === b.id)) return prevFailed;
              return [failedCopy, ...prevFailed];
            });
          } else {
            nextWaiting.push(b);
          }
        });
        return nextWaiting;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [waitingBookings]);

  // ELIMINATE DUAL-ROW GLITCH: Filter duplicates out by unique ID
  const rawFilteredBookings = 
    activeTab === "waiting" ? waitingBookings :
    activeTab === "confirmed" ? confirmedBookings :
    failedBookings;

  const filteredBookings: any[] = Array.from(
    new Map<string, any>(rawFilteredBookings.map((item) => [item.id, item])).values()
  );

  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!pendingRatingBooking || !user) return;
    
    const currentBooking = pendingRatingBooking;
    const selectedStarsCount = rating;
    const textCommentFieldValue = comment;

    try {
      // Construct payload matching exact database fields
      const secureFeedbackData = {
        bookingId: currentBooking.id,
        customer_id: user.uid,
        customerName: user.displayName || user.name || "Client",
        partnerId: currentBooking.partnerId || currentBooking.shopId || "",
        partnerName: currentBooking.shopName || currentBooking.partnerName || "Partner",
        serviceName: currentBooking.serviceName || currentBooking.service || "Service",
        rating: Number(selectedStarsCount),
        comment: textCommentFieldValue || "",
        createdAt: new Date().toISOString()
      };

      // Execute Atomic Writes
      // A) Add entry to the master 'Reviews' collection (Capital R)
      await addDoc(collection(db, "Reviews"), secureFeedbackData);

      // Also write directly to collections/ratings to keep legacy admin dashboard ratings list functional
      await addDoc(collection(db, "ratings"), {
        bookingId: currentBooking.id,
        partnerId: currentBooking.partnerId || currentBooking.shopId || "",
        rating: selectedStarsCount,
        comment: textCommentFieldValue,
        createdAt: serverTimestamp()
      });

      // B) Update local booking document to inject 'review_submitted: true' and avoid loop
      await updateDoc(doc(db, "bookings", currentBooking.id), {
        review_submitted: true,
        rated: true
      });

      // Recalculate and update partner node
      const partnerId = currentBooking.partnerId || currentBooking.shopId;
      if (partnerId) {
        const partnerDocRef = doc(db, "partners", partnerId);
        await runTransaction(db, async (transaction) => {
          const partnerDoc = await transaction.get(partnerDocRef);
          if (partnerDoc.exists()) {
            const partnerData = partnerDoc.data();
            const currentRating = partnerData.rating || partnerData.stars || 5;
            const currentTotalRatings = partnerData.totalRatings || partnerData.ratingCount || partnerData.reviews || 0;
            
            const newTotalRatings = Number(currentTotalRatings) + 1;
            const newRating = Number(((Number(currentRating) * Number(currentTotalRatings) + selectedStarsCount) / newTotalRatings).toFixed(2));
            
            transaction.update(partnerDocRef, {
              rating: newRating,
              stars: newRating,
              totalRatings: newTotalRatings,
              ratingCount: newTotalRatings,
              reviews: newTotalRatings,
              lastRating: selectedStarsCount
            });
          }
        });
      }

      // Immediately after successful completion of these async calls, close the popup state modal to remove the view instantly.
      setPendingRatingBooking(null);
    } catch (error) {
      console.error("[Silent Multi-Path Feedback Pipeline Error]:", error);
    }
  };

  const stats = {
    waiting: waitingBookings.length,
    confirmed: confirmedBookings.length,
    failed: failedBookings.length,
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

        {/* TOP WALLET WIDGET CONTAINER */}
        {user?.uid && (
          <CustomerWalletHeaderWidget db={db} customerId={user.uid} />
        )}

        {/* 2. ESCROW & STATUS TABS */}
        <div className="flex border-b border-gray-100 mb-[3rem] overflow-x-auto scrollbar-hide bg-white sticky top-[5rem] z-20 py-[0.5rem]">
          {[
            {
              key: "waiting",
              label: "WAITING",
              count: stats.waiting,
              color: "text-amber-500",
              activeBg: "bg-amber-500",
            },
            {
              key: "confirmed",
              label: "CONFIRMED",
              count: stats.confirmed,
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
          <div className="hidden md:grid grid-cols-[1.2fr_2fr_1fr_2fr_1.5fr] gap-4 p-6 bg-gray-50/50 border-b border-gray-100 text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">
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
                  const failedOrRejected = isFailedBooking(booking);
                  const isApproved = isBookingApproved(booking) || booking.partner_approved === true || booking.partnerApproved === true;
                  const secsLeft = getBookingSecondsLeft(booking);
                  const isWaiting = isWaitingBooking(booking);

                  const formatCountdown = (secs: number) => {
                    const mins = Math.floor(secs / 60);
                    const s = secs % 60;
                    return `${mins}:${s < 10 ? "0" : ""}${s}s`;
                  };

                  return (
                    <motion.tr
                      key={booking.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      onClick={() => {
                        setSelectedSlot(booking);
                      }}
                      className={`flex flex-col md:grid md:grid-cols-[1.2fr_2fr_1fr_2fr_1.5fr] gap-3 md:gap-4 p-5 md:p-6 cursor-pointer transition-all duration-300 items-start md:items-center font-sans ${
                        failedOrRejected
                          ? "bg-red-500/10 text-red-500 border border-red-500/20"
                          : isWaiting
                            ? "bg-amber-50/60 hover:bg-amber-100/40 border border-amber-200 text-amber-900"
                            : "bg-green-50/60 hover:bg-green-100/40 border border-green-200 text-green-900"
                      }`}
                    >
                      {/* COL 1: ID Token & Shop */}
                      <div className="flex items-center justify-between w-full md:w-auto md:block">
                        <span className={`text-[0.6875rem] font-mono font-bold tracking-wider px-2.5 py-1 md:px-0 md:py-0 rounded flex items-center gap-1.5 ${
                          failedOrRejected ? "text-red-500" : isWaiting ? "text-amber-700" : "text-green-700"
                        }`}>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              failedOrRejected ? "bg-red-500 animate-pulse" : isWaiting ? "bg-amber-500 animate-pulse" : "bg-green-500"
                            }`}
                          />
                          {String(booking.id || "").slice(-8).toUpperCase()}
                        </span>
                        <span className={`text-[0.5625rem] font-bold uppercase tracking-wider md:hidden ${
                          failedOrRejected ? "text-red-500" : isWaiting ? "text-amber-500" : "text-green-600"
                        }`}>
                          {booking.partnerBrandName || booking.shopName || "Partner"}
                        </span>
                      </div>

                      {/* COL 2: Service & Shop */}
                      <div className="w-full md:w-auto">
                        <p className={`text-[0.8125rem] font-bold leading-tight ${
                          failedOrRejected ? "text-red-500 font-extrabold" : isWaiting ? "text-amber-900" : "text-green-905"
                        }`}>
                          {booking.serviceName}
                        </p>
                        <p className={`hidden md:block text-[0.5625rem] uppercase tracking-wider font-semibold mt-0.5 ${
                          failedOrRejected ? "text-red-400" : isWaiting ? "text-amber-600" : "text-green-600"
                        }`}>
                          {booking.partnerBrandName || booking.shopName || "Studio Partner"}
                        </p>
                      </div>

                      {/* COL 3: Amount Paid */}
                      <div className="flex items-center justify-between w-full md:w-auto md:block pt-1 md:pt-0 border-t border-dashed border-gray-100 md:border-none">
                        <span className={`md:hidden text-[0.5625rem] font-bold uppercase tracking-widest ${
                          failedOrRejected ? "text-red-500" : isWaiting ? "text-amber-650" : "text-green-500"
                        }`}>
                          Amount
                        </span>
                        <span className={`text-[0.8125rem] font-mono font-bold ${
                          failedOrRejected ? "text-red-500" : isWaiting ? "text-amber-700" : "text-green-700"
                        }`}>
                          ₹{booking.amountPaid}
                        </span>
                      </div>

                      {/* COL 4: Target Execution Timestamp */}
                      <div className="flex items-center justify-between w-full md:w-auto md:block pt-1 md:pt-0">
                        <span className={`md:hidden text-[0.5625rem] font-bold uppercase tracking-widest ${
                          failedOrRejected ? "text-red-500" : isWaiting ? "text-amber-650" : "text-green-500"
                        }`}>
                          Execution Time
                        </span>
                        <div className="text-right md:text-left">
                          <p className={`text-[0.75rem] font-bold ${
                            failedOrRejected ? "text-red-500" : isWaiting ? "text-amber-900" : "text-green-909"
                          }`}>
                            {booking.selectedDate}
                          </p>
                          <p className={`text-[0.625rem] font-medium md:mt-0.5 ${
                            failedOrRejected ? "text-red-400" : isWaiting ? "text-amber-600" : "text-green-600"
                          }`}>
                            {booking.selectedSlot}
                          </p>
                        </div>
                      </div>

                      {/* COL 5: Stylized Badge / Execution Status */}
                      <div className="flex items-center justify-between w-full md:w-auto md:justify-end pt-2 md:pt-0">
                        <span className={`md:hidden text-[0.5625rem] font-bold uppercase tracking-widest ${
                          failedOrRejected ? "text-red-500" : isWaiting ? "text-amber-650" : "text-green-500"
                        }`}>
                          Status
                        </span>
                        {isWaiting ? (
                          <div className="flex flex-col md:items-end items-start gap-1 pb-1">
                            <span className="text-[0.5625rem] font-bold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border bg-amber-50 border-amber-300 text-amber-700 animate-pulse">
                              Held in Escrow ({formatCountdown(secsLeft)})
                            </span>
                            <span className="text-[0.5rem] font-medium text-amber-605 uppercase tracking-tight text-right whitespace-normal md:max-w-[180px]">
                              Please wait 5 minutes for partner verification
                            </span>
                          </div>
                        ) : failedOrRejected ? (
                          <div className="flex flex-col md:items-end items-start gap-1">
                            <span className="text-[0.5625rem] font-bold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border bg-red-100/80 border-red-300 text-red-700 font-sans shadow-inner">
                              Failed / Refunded
                            </span>
                          </div>
                        ) : (
                          <span className="text-[0.5625rem] font-bold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border bg-green-50 border-green-200 text-green-600">
                            Confirmed
                          </span>
                        )}
                      </div>
                    </motion.tr>
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

      {/* Single Comprehensive Slot Details Modal Overlay */}
      <AnimatePresence>
        {selectedSlot && (
          <SelectedSlotDetailsModal
            item={selectedSlot}
            onClose={() => setSelectedSlot(null)}
          />
        )}
      </AnimatePresence>

      {/* Failure/Rejected Detailed Refund Refund Modal Overlay */}
      <AnimatePresence>
        {selectedFailedBooking && (
          <FailedBookingDetailsModal
            booking={selectedFailedBooking}
            onClose={() => setSelectedFailedBooking(null)}
          />
        )}
      </AnimatePresence>

      {/* Success Auto-dismiss Pop-Up Modal Overlay */}
      <AnimatePresence>
        {showSuccessPopup && popupData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-charcoal/40 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", duration: 0.45 }}
              className="bg-white rounded-[2.5rem] border border-green-100 shadow-2xl max-w-md w-full overflow-hidden flex flex-col font-sans"
            >
              {/* Header Banner - Emerald Theme Accent */}
              <div className="p-8 pb-5 text-white bg-gradient-to-br from-green-500 to-emerald-600 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-12 -translate-y-12" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10 shadow-inner">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[0.5625rem] font-bold uppercase tracking-[0.3em] bg-white/25 px-2.5 py-1 rounded-full text-white/95">
                      Transaction Confirmed
                    </span>
                    <h3 className="text-xl font-serif font-black text-white mt-1.5 leading-tight">
                      Booking Initialized Successfully!
                    </h3>
                  </div>
                </div>
              </div>

              {/* Dynamic Customer & Booking Details */}
              <div className="p-8 space-y-5 flex-grow">
                <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-3.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Customer</span>
                      <p className="text-[0.875rem] font-bold text-charcoal truncate mt-0.5">
                        {popupData.customerName || popupData.customer_name || displayName}
                      </p>
                    </div>
                    <div>
                      <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Partner</span>
                      <p className="text-[0.875rem] font-bold text-bbBlue truncate mt-0.5">
                        {popupData.partnerBrandName || popupData.shopName || "Partner Studio"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-100 pt-3.5">
                    <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Selected Service</span>
                    <p className="text-[0.875rem] font-bold text-charcoal mt-0.5">
                      {popupData.serviceName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-dashed border-gray-100 pt-3.5">
                    <div>
                      <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Date</span>
                      <p className="text-[0.8125rem] font-bold text-charcoal mt-0.5">
                        {popupData.selectedDate}
                      </p>
                    </div>
                    <div>
                      <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Time Slot</span>
                      <p className="text-[0.8125rem] font-mono font-bold text-charcoal mt-0.5">
                        {popupData.selectedSlot}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-green-600 bg-green-50/60 p-4 rounded-xl border border-green-150">
                  <svg className="w-5 h-5 shrink-0 animate-pulse text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <p className="text-[0.625rem] font-bold uppercase tracking-wider">
                    Redirecting to dynamic waiting tab...
                  </p>
                </div>
              </div>

              {/* Progress dismiss bar */}
              <div className="h-1.5 w-full bg-gray-100">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 4, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRatingBooking && pendingRatingBooking.status === "completed" && !pendingRatingBooking.review_submitted && (
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
