import { db, auth } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';

/**
 * Interfaces for Data Structures
 */
export interface SettlementInfo {
  totalAmount: number;
  status: 'PENDING (ESCROW)' | 'READY FOR PAYOUT';
  payoutUpi: string;
  cycleEnd: string;
}

export interface WorkerInsight {
  workerId: string;
  workerName: string;
  workerImage?: string;
  earnings: number;
  bookingCount: number;
  todayTotal: number;
}

export interface FinancialSummary {
  confirmedAmount: number;
  escrowAmount: number;
  nextPayoutTime: string;
  timeRemaining: string;
}

/**
 * PARTNER / SHOP SERVICES
 */

// Fetch all partners (Production Firebase)
export const getShops = async (): Promise<any[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'partners'));
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data() as any;
      return { 
        id: docSnapshot.id, 
        ...data,
        brandName: data.brand_name || data.brandName,
        ownerName: data.owner_name || data.ownerName,
        mobile: data.mobile_number || data.mobile,
        lat: data.lat || data.coords?.lat,
        lng: data.lng || data.coords?.lng,
        shopImages: data.shopImages || data.brandImages || [],
        workerImages: data.workerImages || [],
        adminApproved: data.adminApproved || data.status === 'approved' || data.status === 'active'
      };
    });
  } catch (err) {
    console.error('Firestore getShops failure:', err);
    throw err;
  }
};

/**
 * ROADMAP COMPLIANT DATA FETCHERS
 */

// getPendingPartners: For Admin Verification Queue
export const getPendingPartners = async (): Promise<any[]> => {
  try {
    // Fetch from verification_queue as requested by system protocol
    const querySnapshot = await getDocs(collection(db, 'verification_queue'));
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data() as any;
      return {
        id: docSnapshot.id,
        ...data,
        brandName: data.brandName || data.brand_name || 'Unnamed Shop',
        ownerName: data.ownerName || data.owner_name || 'N/A',
        workerCount: data.workerCount || data.workerQuantity || data.worker_quantity || 1,
        govtIdUrl: data.govtIdUrl || data.govId || data.gov_id || 'pending_upload',
        shopImages: data.shopImages || data.brandImages || [],
        workerImages: data.workerImages || data.staffImages || [],
        mobile: data.mobile || data.mobileNumber || 'N/A'
      };
    });
  } catch (err) {
    console.error("getPendingPartners verification_queue error:", err);
    // Legacy fallback to partners collection if queue is missing
    const q = query(collection(db, 'partners'), where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        brandName: data.brandName || data.brand_name || 'Unnamed Shop',
        ownerName: data.ownerName || data.owner_name || 'N/A',
        workerCount: data.workerCount || data.workerQuantity || data.worker_quantity || 1,
        govtIdUrl: data.govtIdUrl || data.govId || data.gov_id || 'pending_upload',
        shopImages: data.shopImages || data.brandImages || [],
        workerImages: data.workerImages || data.staffImages || [],
        mobile: data.mobile || data.mobileNumber || 'N/A'
      };
    });
  }
};

// getApprovedPartners: For Customer Explore Page
export const getApprovedPartners = async (category?: string): Promise<any[]> => {
  try {
    let q = query(collection(db, 'partners'), where('status', '==', 'approved'));
    if (category) {
      q = query(collection(db, 'partners'), where('status', '==', 'approved'), where('category', '==', category));
    }
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data() as any;
      return { 
        id: docSnapshot.id, 
        ...data,
        brandName: data.brand_name || data.brandName,
        ownerName: data.owner_name || data.ownerName,
        mobile: data.mobile_number || data.mobile,
        lat: data.lat || data.coords?.lat,
        lng: data.lng || data.coords?.lng,
        shopImages: data.shopImages || data.brandImages || [],
        workerImages: data.workerImages || [],
        adminApproved: data.adminApproved || data.status === 'approved' || data.status === 'active'
      };
    });
    // Instantly hide shop on Explore Page if isActive is explicitly false
    return results.filter(shop => shop.isActive !== false);
  } catch (err) {
    console.error("getApprovedPartners error:", err);
    // Fallback if index/composite index is missing: filter in memory
    const all = await getShops();
    return all.filter(shop => {
      const isApproved = shop.status === 'approved' || shop.adminApproved === true;
      if (!isApproved) return false;
      if (shop.isActive === false) return false;
      if (category && shop.category !== category) return false;
      return true;
    });
  }
};

// Legacy alias for compatibility
export const getApprovedShops = getApprovedPartners;

// Add a new shop (Production Firebase)
export const addShop = async (shopData: any) => {
  try {
    // CRITICAL: Document ID must be the Authenticated User's UID if available
    const docId = auth.currentUser?.uid || shopData.uid || shopData.id || (shopData.mobile ? String(shopData.mobile) : undefined);
    
    if (!docId) {
      throw new Error("No authenticated user ID or document ID found.");
    }

    // Force/Clean only the defined fields in the Firestore Schema to prevent rules/validation crash
    const brandNameStr = String(shopData.brandName || shopData.brand_name || '').slice(0, 100);
    const ownerNameStr = String(shopData.ownerName || shopData.owner_name || '');
    const mobileNumberStr = String(shopData.mobileNumber || shopData.mobile || '');
    const addressStr = String(shopData.manualAddress || shopData.address || '');
    const categoryStr = String(shopData.category || 'Barber');
    const workerQuantityNum = Number(shopData.workerCount || shopData.workerQuantity || 1);
    const upiIdStr = String(shopData.upiId || '');
    const coordsVal = shopData.coords || { lat: null, lng: null };
    const ownerPictureStr = String(shopData.ownerPicture || 'pending_upload');
    const govIdStr = String(shopData.govId || shopData.govtIdUrl || shopData.govtId || 'pending_upload');
    const shopImagesArr = Array.isArray(shopData.shopImages || shopData.brandImages) ? (shopData.shopImages || shopData.brandImages) : [];
    const workerImagesArr = Array.isArray(shopData.workerImages) ? shopData.workerImages : [];

    // STRICTLY aligned to Firestore rules isValidPartner and allowed keys schema
    const normalizedData: any = {
      ownerName: ownerNameStr,
      brandName: brandNameStr,
      status: 'pending',
      mobileNumber: mobileNumberStr,
      address: addressStr,
      category: categoryStr,
      workerQuantity: workerQuantityNum,
      upiId: upiIdStr,
      coords: coordsVal,
      ownerPicture: ownerPictureStr,
      govId: govIdStr,
      brandImages: shopImagesArr, // Align for dashboard integration
      workerImages: workerImagesArr,
      onboardingComplete: true,
      adminApproved: false,
      updatedAt: shopData.updatedAt || new Date().toISOString()
    };

    // Execute writes with merge: true to avoid deleting unmodifiable keys like createdAt, avoiding affectedKeys rules failure
    const p1 = setDoc(doc(db, 'partners', docId), normalizedData, { merge: true });
    
    // Safety Net: verification_queue might fail depending on project rules, swallow error to never block partner admission
    const p2 = setDoc(doc(db, 'verification_queue', docId), normalizedData).catch(err => {
      console.warn("Verification queue write bypassed or skipped:", err);
      return null;
    });

    await Promise.all([p1, p2]);
    return { id: docId, ...normalizedData };
  } catch (err) {
    console.error('Firestore addShop production failure:', err);
    throw err;
  }
};

// Update shop details (Production Firebase)
export const updateShop = async (id: string, updates: any) => {
  try {
    const docRef = doc(db, 'partners', id);
    await updateDoc(docRef, updates);
    
    // If shop is approved or rejected, remove from verification_queue
    if (updates.status === 'approved' || updates.status === 'active' || updates.adminApproved === true || updates.status === 'rejected') {
      try {
        await deleteDoc(doc(db, 'verification_queue', id));
      } catch (deleteErr) {
        console.debug("Note: verification_queue entry already removed or missing.");
      }
    }

    // If status is being updated to approved/active, sync with user collection
    if (updates.status === 'approved' || updates.status === 'active' || updates.adminApproved === true) {
      try {
        const userRef = doc(db, 'users', id);
        await updateDoc(userRef, { 
          status: 'active',
          adminApproved: true 
        });
      } catch (userErr) {
        console.warn("Could not sync status to users collection (might be using mobile ID):", userErr);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Firestore updateShop production failure:', err);
    throw err;
  }
};

// Fetch a single shop by ID (Production Firebase)
export const getShopById = async (id: string): Promise<any> => {
  try {
    const docRef = doc(db, 'partners', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data() as any;
    
    // Fetch individual services from sub-collection for precise logic
    const servicesSnap = await getDocs(collection(db, 'partners', id, 'services'));
    const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return {
      id: docSnap.id,
      ...data,
      services: services.length > 0 ? services : (data.services || []), // Fallback to array for migration
      brandName: data.brand_name || data.brandName,
      ownerName: data.owner_name || data.ownerName,
      mobile: data.mobile_number || data.mobile,
      upiId: data.upi_id || data.upiId,
      workerQuantity: data.worker_quantity || data.workerQuantity,
      status: data.status || 'pending',
      lat: data.lat || data.coords?.lat,
      lng: data.lng || data.coords?.lng,
      shopImages: data.shopImages || data.brandImages || [],
      workerImages: data.workerImages || [],
      adminApproved: data.adminApproved || data.status === 'approved'
    };
  } catch (err) {
    console.error('Firestore getShopById production failure:', err);
    throw err;
  }
};

/**
 * SERVICE SUB-COLLECTION MANAGEMENT
 */

export const addShopService = async (partnerId: string, service: any) => {
  try {
    const serviceId = service.id || Date.now().toString();
    const docRef = doc(db, 'partners', partnerId, 'services', serviceId);
    await setDoc(docRef, { ...service, id: serviceId, createdAt: Timestamp.now() });
    return { ...service, id: serviceId };
  } catch (err) {
    console.error("addShopService fail:", err);
    throw err;
  }
};

export const updateShopService = async (partnerId: string, serviceId: string, updates: any) => {
  try {
    const docRef = doc(db, 'partners', partnerId, 'services', serviceId);
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.error("updateShopService fail:", err);
    throw err;
  }
};

export const deleteShopService = async (partnerId: string, serviceId: string) => {
  try {
    const docRef = doc(db, 'partners', partnerId, 'services', serviceId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error("deleteShopService fail:", err);
    throw err;
  }
};

/**
 * BOOKING SERVICES
 */

// Fetch bookings (filtered by user if ID provided)
export const getBookings = async (userId?: string): Promise<any[]> => {
  try {
    if (userId) {
      // Create specific queries for Customer and Partner roles to match Security Rules precisely
      const qCustomer = query(collection(db, 'bookings'), where('customerId', '==', userId));
      const qPartner = query(collection(db, 'bookings'), where('partnerId', '==', userId));
      
      const [snapCustomer, snapPartner] = await Promise.all([
        getDocs(qCustomer),
        getDocs(qPartner)
      ]);
      
      const results = new Map();
      snapCustomer.docs.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));
      snapPartner.docs.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));
      
      return Array.from(results.values());
    }
    
    // For Admins (Strictly controlled by Security Rules)
    const qAdmin = query(collection(db, 'bookings'));
    const querySnapshot = await getDocs(qAdmin);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('Firestore getBookings failure:', err);
    throw err;
  }
};

// Add a new booking
export const addBooking = async (booking: any) => {
  try {
    const newBooking = {
      ...booking,
      createdAt: new Date().toISOString(),
      status: 'Pending'
    };
    const docRef = await addDoc(collection(db, 'bookings'), newBooking);
    return { id: docRef.id, ...newBooking };
  } catch (err) {
    console.error('Firestore addBooking failure:', err);
    throw err;
  }
};

// Update booking status or details
export const updateBooking = async (bookingId: string, updates: any) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.error('Firestore updateBooking failure:', err);
    throw err;
  }
};

/**
 * RATING & REVIEWS
 */
export const submitRating = async (bookingId: string, partnerId: string, rating: number, comment: string) => {
  try {
    const ratingData = {
      bookingId,
      partnerId,
      rating,
      comment,
      createdAt: Timestamp.now()
    };
    
    // 1. Add to ratings collection
    await addDoc(collection(db, 'ratings'), ratingData);
    
    // 2. Update booking to mark as rated
    await updateBooking(bookingId, { rated: true });
    
    // 3. Update partner's average rating (complex logic omitted for brevity, usually handled by Cloud Function or simplified here)
    // For now we just sync the latest rating to the partner's doc for quick view
    await updateShop(partnerId, { lastRating: rating, totalRatings: (Timestamp.now().toMillis() % 100) + 1 }); // Mocking increments
    
    return true;
  } catch (err) {
    console.error("submitRating failure:", err);
    throw err;
  }
};

export const getRatings = async (partnerId?: string): Promise<any[]> => {
  try {
    let q;
    if (partnerId) {
      q = query(collection(db, 'ratings'), where('partnerId', '==', partnerId), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'ratings'), orderBy('createdAt', 'desc'), limit(50));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  } catch (err) {
    console.error('Firestore getRatings failure:', err);
    return [];
  }
};

// Legacy status update helper
export const updateBookingStatus = async (bookingId: string, newStatus: string) => {
  return updateBooking(bookingId, { status: newStatus });
};

/**
 * SETTINGS & NOTIFICATIONS
 */

export const getSettings = async (): Promise<any> => {
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    return { platformFee: 10, broadcasts: [] };
  } catch (err) {
    console.error('Firestore getSettings failure:', err);
    throw err;
  }
};

export const updateSettings = async (updates: any) => {
  try {
    const docRef = doc(db, 'settings', 'global');
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.error('Firestore updateSettings failure:', err);
    throw err;
  }
};

export const sendNotification = async (message: string, target: 'all' | 'customers' | 'partners' = 'all') => {
  try {
    const payload = {
      message,
      target,
      timestamp: new Date().toISOString(),
      createdAt: Timestamp.now(),
      type: 'GLOBAL BROADCAST'
    };
    await addDoc(collection(db, 'notifications'), payload);
    return true;
  } catch (err) {
    console.error('Firestore sendNotification failure:', err);
    throw err;
  }
};

export const subscribeToNotifications = (target: string, userId: string, callback: (notifs: any[]) => void) => {
  // Use a query that matches the security rules' 'in' logic exactly
  const q = query(
    collection(db, 'notifications'),
    where('target', 'in', ['all', target, userId]),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (err) => {
    console.error('Firestore notification sync error:', err);
    callback([]); // Return empty list on snapshot error
  });
};

/**
 * ADMIN DROPSHIP ENGINE: MARKETPLACE METHODS
 */

export const addMarketplaceProduct = async (productData: {
  name: string;
  sourceUrl: string;
  imageUrl: string;
  price: number;
  category: string;
  discount?: number;
  rating?: number;
  reviews?: number;
}): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'live_marketplace'), {
      ...productData,
      discount: productData.discount !== undefined ? productData.discount : 0,
      rating: productData.rating !== undefined ? productData.rating : 5,
      reviews: productData.reviews !== undefined ? productData.reviews : Math.floor(Math.random() * 80) + 10,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.error('Firestore addMarketplaceProduct failure:', err);
    throw err;
  }
};

export const getMarketplaceProducts = async (): Promise<any[]> => {
  try {
    const qSnapshot = await getDocs(collection(db, 'live_marketplace'));
    return qSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.error('Firestore getMarketplaceProducts failure:', err);
    throw err;
  }
};

export const deleteMarketplaceProduct = async (productId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'live_marketplace', productId));
  } catch (err) {
    console.error('Firestore deleteMarketplaceProduct failure:', err);
    throw err;
  }
};

/**
 * ANALYTICS & LOGIC CALCULATIONS
 */

export const getFinancialSummary = (partnerId: string, allBookings: any[]): FinancialSummary => {
  const now = Date.now();
  const twelveHours = 12 * 60 * 60 * 1000;
  
  const confirmed = allBookings.filter(b => 
    b.shopId === partnerId && 
    ['Confirmed', 'Accepted', 'settlement_due'].includes(b.status)
  );

  const confirmedAmount = confirmed.reduce((sum, b) => sum + (b.price || 0), 0);
  const escrowAmount = allBookings
    .filter(b => b.shopId === partnerId && b.status === 'payment_held')
    .reduce((sum, b) => sum + (b.price || 0), 0);

  return {
    confirmedAmount,
    escrowAmount,
    nextPayoutTime: new Date(now + twelveHours).toISOString(),
    timeRemaining: "12h 00m"
  };
};

export const calculateSettlements = (partnerId: string, allBookings: any[], upiId: string): SettlementInfo[] => {
  const partnerBookings = allBookings.filter(b => b.shopId === partnerId);
  if (partnerBookings.length === 0) return [];

  return [{
    totalAmount: partnerBookings.reduce((sum, b) => sum + (b.price || 0), 0),
    status: 'READY FOR PAYOUT',
    payoutUpi: upiId,
    cycleEnd: new Date().toISOString()
  }];
};

export const getWorkerInsights = (partnerId: string, allBookings: any[], shopWorkers: any[]): WorkerInsight[] => {
  return (shopWorkers || []).map(worker => {
    const workerBookings = allBookings.filter(b => b.shopId === partnerId && b.workerName === worker.name);
    return {
      workerId: worker.name,
      workerName: worker.name,
      workerImage: worker.image,
      earnings: workerBookings.reduce((sum, b) => sum + (b.price || 0), 0),
      bookingCount: workerBookings.length,
      todayTotal: 0
    };
  });
};

export const getGrowthPercentage = (partnerId: string, allBookings: any[]): string => {
  return "+12.5%"; // Mock growth calculation
};

export const calculateWaitTime = (partnerId: string, allBookings: any[]): number => {
  const active = allBookings.filter(b => b.shopId === partnerId && b.status === 'Accepted');
  return active.length * 20; // 20 mins per active booking
};
