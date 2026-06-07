import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { getBookings, submitRating } from "../services/logic_engine";
import RatingModal from "../components/RatingModal";

import { PersistenceService } from "../services/PersistenceService";

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>(
    PersistenceService.load("customer_bookings") || [],
  );
  const [loading, setLoading] = useState(
    !PersistenceService.load("customer_bookings"),
  );
  const [activeTab, setActiveTab] = useState<"approved" | "pending" | "failed">(
    "approved",
  );
  const [pendingRatingBooking, setPendingRatingBooking] = useState<any>(null);

  // CRITICAL REDIRECT: Ensure partners never land on Customer Dashboard
  useEffect(() => {
    if (user && user.role === "partner") {
      console.log(
        "[SECURITY] Partner detected on Customer Hub. Redirecting to Terminal...",
      );
      navigate(user.onboardingComplete ? "/partner-dashboard" : "/onboarding", {
        replace: true,
      });
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

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      try {
        const data = await getBookings(user.uid);
        setBookings(data);
        setLoading(false);
        PersistenceService.save("customer_bookings", data);

        // Priority: Check for completed bookings that need rating
        const needsRating = data.find(
          (b: any) => b.status === "completed" && !b.rated,
        );
        if (needsRating) {
          setPendingRatingBooking(needsRating);
        }

        // AUTO-REFUND LOGIC: Check for expired held payments
        const now = Date.now();
        const FIVE_MINUTES = 5 * 60 * 1000;
        data.forEach(async (booking: any) => {
          if (booking.status === "payment_held" && booking.heldAt) {
            const heldTime = new Date(booking.heldAt).getTime();
            if (now - heldTime >= FIVE_MINUTES) {
              console.log(
                `[Auto-Refund Customer Engine] Booking ${booking.id} has expired. Auto-refunding payment...`,
              );
              try {
                await fetch("/api/razorpay/refund", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    paymentId: booking.transactionId,
                    amount: booking.price,
                    bookingId: booking.id,
                  }),
                });
              } catch (err) {
                console.error(
                  `[Auto-Refund Customer Engine Error] bookingId=${booking.id}:`,
                  err,
                );
              }
            }
          }
        });
      } catch (error) {
        console.debug(
          "Background fetch throttled (bypass mode active):",
          error,
        );
      }
    };

    fetchBookings();
    const interval = setInterval(fetchBookings, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const isEscrowVerified = (b: any) => {
    const paymentStatusStr = String(b.paymentStatus || "").toUpperCase();
    const hasValidTxId = b.transactionId && b.transactionId.trim() !== "";
    return (
      b.status === "payment_held" &&
      hasValidTxId &&
      paymentStatusStr !== "UNPAID" &&
      paymentStatusStr !== "PENDING" &&
      paymentStatusStr !== "FAILED"
    );
  };

  const isRejectFailed = (b: any) => {
    // 1. Explicit failed/rejected/cancelled statuses
    if (
      b.status === "rejected" ||
      b.status === "failed" ||
      b.status === "Cancelled" ||
      b.status === "cancelled" ||
      b.status === "REFUNDED/FAILED" ||
      b.paymentStatus === "failed" ||
      b.paymentStatus === "abandoned"
    ) {
      return true;
    }

    // 2. Initial order/slot states that were never paid (dropped/unpaid/pending, or pending_payment)
    if (
      b.status === "PENDING_PAYMENT" ||
      b.bookingStatus === "pending_payment"
    ) {
      return true;
    }

    // 3. Or if status says payment_held but the actual payment was unpaid, pending, failed, or has no valid transaction ID
    if (b.status === "payment_held") {
      return !isEscrowVerified(b);
    }

    return false;
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "pending") return isEscrowVerified(b);
    if (activeTab === "failed") return isRejectFailed(b);
    return b.status === "approved" || b.status === "confirmed";
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
      // Data will refresh on next interval
    } catch (error) {
      console.error("Failed to submit rating:", error);
    }
  };

  const stats = {
    approved: bookings.filter(
      (b) => b.status === "approved" || b.status === "confirmed",
    ).length,
    pending: bookings.filter(isEscrowVerified).length,
    failed: bookings.filter(isRejectFailed).length,
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
                <img
                  src={photoURL}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-bbBlue flex items-center justify-center text-white text-[2.5rem] font-serif font-bold">
                  {displayName?.[0] || "U"}
                </div>
              )}
            </div>
            <div className="absolute bottom-[0.25rem] right-[0.25rem] w-[2rem] h-[2rem] bg-bbBlue text-white rounded-full flex items-center justify-center shadow-lg border border-white">
              <svg
                className="w-[1rem] h-[1rem]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
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
              <p className="text-[1.875rem] font-serif font-bold text-bbBlue">
                {bookings.length}
              </p>
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
              key: "pending",
              label: "Held (Escrow)",
              count: stats.pending,
              color: "text-bbBlue",
              activeBg: "bg-bbBlue",
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
                activeTab === tab.key
                  ? tab.color
                  : "text-gray-300 hover:text-charcoal"
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

        {/* 3. LISTING AREA */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[2.5rem]">
          <AnimatePresence mode="wait">
            {loading ? (
              <div className="col-span-full py-[10rem] flex flex-col items-center justify-center gap-[1.5rem]">
                <div className="w-[3rem] h-[3rem] border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.4em]">
                  Connecting to Registry...
                </p>
              </div>
            ) : filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => {
                const failedOrRejected = isRejectFailed(booking);
                const isPendingEscrow = isEscrowVerified(booking);

                return (
                  <motion.div
                    key={booking.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white border border-gray-100 p-[2.5rem] rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-700 group relative overflow-hidden flex flex-col"
                  >
                    {/* Status Indicator Bar */}
                    <div
                      className={`absolute top-0 left-0 w-full h-[0.375rem] ${
                        failedOrRejected
                          ? "bg-red-500"
                          : isPendingEscrow
                            ? "bg-bbBlue animate-pulse"
                            : "bg-green-500"
                      }`}
                    ></div>

                    <div className="flex justify-between items-start mb-[2.5rem]">
                      <div
                        className={`w-[4rem] h-[4rem] rounded-2xl flex items-center justify-center border shadow-sm transition-all ${
                          failedOrRejected
                            ? "bg-red-50 border-red-100 text-red-500"
                            : isPendingEscrow
                              ? "bg-blue-50 border-blue-100 text-bbBlue"
                              : "bg-green-50 border-green-100 text-green-500"
                        }`}
                      >
                        <svg
                          className="w-[2rem] h-[2rem]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {isPendingEscrow ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          )}
                        </svg>
                      </div>
                      <p className="text-[0.5625rem] font-bold text-gray-300 uppercase tracking-widest">
                        {failedOrRejected ? "ABND-" : "TRX-"}
                        {(booking.transactionId || booking.id || "").slice(-6)}
                      </p>
                    </div>

                    <div className="flex-grow">
                      <h3 className="text-[1.5rem] font-serif font-bold text-charcoal mb-[0.5rem] tracking-tight">
                        {booking.shopName || "Studio Partner"}
                      </h3>
                      <p
                        className={`text-[0.625rem] font-bold uppercase tracking-[0.25em] mb-[2.5rem] ${failedOrRejected ? "text-red-500" : "text-bbBlue"}`}
                      >
                        {isPendingEscrow
                          ? "Pending Partner Approval"
                          : booking.serviceName}
                      </p>

                      <div className="grid grid-cols-2 gap-[2rem] pt-[2rem] border-t border-gray-50 mb-[2rem]">
                        <div>
                          <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.5rem]">
                            Reserved Time
                          </p>
                          <p className="text-[0.6875rem] font-bold text-charcoal uppercase tracking-tighter">
                            {booking.date}
                          </p>
                          <p className="text-[0.625rem] text-gray-400 font-medium">
                            {booking.time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.5rem]">
                            Payment Status
                          </p>
                          <p
                            className={`text-[0.6875rem] font-bold uppercase tracking-widest ${
                              failedOrRejected ? "text-red-500" : "text-bbBlue"
                            }`}
                          >
                            {failedOrRejected
                              ? booking.paymentStatus?.toUpperCase() || "FAILED"
                              : isPendingEscrow
                                ? "HELD IN ESCROW"
                                : booking.paymentStatus?.toUpperCase() ||
                                  "VOID"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {(booking.message || booking.statusReason) && (
                      <div className="mt-auto p-[1.5rem] bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.5rem] flex items-center gap-[0.5rem]">
                          <span className="w-[0.375rem] h-[0.375rem] rounded-full bg-bbBlue"></span>
                          Platform Note
                        </p>
                        <p className="text-[0.6875rem] text-gray-600 italic font-medium leading-relaxed">
                          "{booking.message || booking.statusReason}"
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-[12rem] flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[4rem] bg-gray-50/20"
              >
                <div className="w-[6rem] h-[6rem] bg-white rounded-full flex items-center justify-center mb-[2rem] shadow-xl border border-gray-100">
                  <svg
                    className="w-[2.5rem] h-[2.5rem] text-gray-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
