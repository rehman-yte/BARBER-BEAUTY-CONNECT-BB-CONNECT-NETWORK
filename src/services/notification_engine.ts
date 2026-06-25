import { onSnapshot, query, collection, where, doc, setDoc } from 'firebase/firestore';

// In-memory data store for notifications targeting the specific customer
let customerBellDropdownList: any[] = [];

/**
 * Cleanly resets the customer dropdown list
 */
export const clearCustomerBellDropdownList = () => {
  customerBellDropdownList = [];
};

/**
 * Returns the current unread alert payloads and audio loops inside Customer Navigation Controller
 */
export const getCustomerBellDropdownList = () => {
  return customerBellDropdownList;
};

/**
 * Pushes alert payloads into the in-memory bell registry
 */
export const pushToCustomerBellDropdownList = (alert: {
  id: string;
  title: string;
  message: string;
  timestamp: any;
  isRead: boolean;
}) => {
  const exists = customerBellDropdownList.some(item => item.id === alert.id);
  if (!exists) {
    customerBellDropdownList.push(alert);
  }
};

/**
 * 1. CUSTOMER PORTAL REAL-TIME BELL STREAM & AUDIO ENGINE
 * Listen exclusively for alerts targeting the specific customer icon dropdown
 */
export const initializeCustomerNotificationStream = (currentCustomerId: string, dbReference: any) => {
  return onSnapshot(
    query(collection(dbReference, "notifications"), where("targetUserId", "==", currentCustomerId)),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const alertData = change.doc.data();
          
          // RULE: Insert metadata and descriptive text strictly inside the Bell Icon data layer array only
          pushToCustomerBellDropdownList({
            id: change.doc.id,
            title: alertData.title, // e.g., "Slot Booked Successfully" / "New Offer Released"
            message: alertData.message,
            timestamp: alertData.createdAt,
            isRead: false
          });

          // RULE: Play sound EXACTLY ONE TIME only if a specific partner accepts the booking slot
          if (alertData.triggerType === "PARTNER_ACCEPTED") {
            triggerNotificationAudioLoop(1); // 1-Time Chime
          }
        }
      });
    }
  );
};

/**
 * 2. PARTNER PORTAL REQUEST TRIGGER & 3-TIME AUDIO LOOP
 * Track incoming bookings for specific partners without leaking data to other UI nodes
 */
export const initializePartnerRequestNotificationStream = (currentPartnerId: string, dbReference: any) => {
  return onSnapshot(
    query(collection(dbReference, "bookings"), where("partnerId", "==", currentPartnerId), where("status", "==", "pending")),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          // CRITICAL CONSTRAINT: Booking data stays locked inside the current registry UI layout table ONLY.
          // Trigger the notification bell alert system to ring EXACTLY 3 TIMES for incoming requests.
          triggerNotificationAudioLoop(3); // Loops precisely 3 times, then stops
        }
      });
    }
  );
};

/**
 * 3. CORE SHARED SOUND LOOP GENERATOR FUNCTION
 */
export const triggerNotificationAudioLoop = (playbackCount: number) => {
  const notificationAudio = new Audio("/assets/heavy_notification.mp3");
  let currentIteration = 0;

  const playSequence = () => {
    if (currentIteration < playbackCount) {
      notificationAudio.play()
        .then(() => {
          currentIteration++;
          // Wait for the track to naturally conclude before executing the next sequence loop
          notificationAudio.onended = () => {
            playSequence();
          };
        })
        .catch((error) => console.log("Browser interaction safety rule blocked immediate autoplay:", error));
    }
  };
  
  playSequence();
};

/**
 * Python-equivalent logic described in Section 4 (represented in TS for backend/client integration):
 * Offers broadcast method mapping active customer profiles
 */
export const broadcastAdminOfferToBellSystemJs = async (
  offerTitle: string,
  offerDetails: string,
  dbReference: any,
  customersSnapshotProvider: () => Promise<any[]>
) => {
  try {
    const customers = await customersSnapshotProvider();
    
    for (const customer of customers) {
      const newAlertRef = doc(collection(dbReference, "notifications"));
      await setDoc(newAlertRef, {
        targetUserId: customer.id,
        title: `🎁 SPECIAL OFFER: ${offerTitle}`,
        message: offerDetails,
        triggerType: "ADMIN_OFFER_RELEASED",
        createdAt: new Date().toISOString(),
        isRead: false
      });
    }
    return { status: "success", message: "Broadcast written offer directly to customer bell components" };
  } catch (error: any) {
    return { status: "error", message: error.message };
  }
};
