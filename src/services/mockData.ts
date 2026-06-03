import { db } from '../lib/firebase';
import { collection, getDocs, getDoc, doc, addDoc, updateDoc, query, where, setDoc } from 'firebase/firestore';

// Mock data for the BB Connect Network (Fallback only)
export const INITIAL_SHOPS = [
  {
    id: 'shop1',
    brandName: 'The Royal Grooming',
    ownerName: 'Vikram Singh',
    category: 'Barber',
    isVerified: true,
    isApproved: true,
    isActive: true,
    status: 'Active',
    onboardedAt: new Date().toISOString(),
    upiId: 'royal@upi',
    shopImages: ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600'],
    workers: [
      { name: 'Arjun', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop' },
      { name: 'Karan', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop' }
    ],
    services: [
      { name: 'Royal Haircut', price: 500 },
      { name: 'Beard Trim', price: 300 },
      { name: 'Head Massage', price: 200 }
    ],
    bookings: []
  }
];

export const getShops = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'partners'));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Map Firestore fields back to frontend fields if necessary
    return (data || []).map((item: any) => ({
      ...item,
      brandName: item.brand_name || item.brandName,
      ownerName: item.owner_name || item.ownerName,
      mobile: item.mobile_number || item.mobile,
      upiId: item.upi_id || item.upiId,
      workerQuantity: item.worker_quantity || item.workerQuantity,
      status: item.status,
      isApproved: item.status === 'active' || item.isApproved,
      isActive: item.status === 'active' || item.isActive
    }));
  } catch (err) {
    console.error('Firestore fetch error, falling back to local:', err);
    return INITIAL_SHOPS;
  }
};

export const getShopById = async (id: string) => {
  try {
    const docRef = doc(db, 'partners', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    const data = docSnap.data();

    return {
      id: docSnap.id,
      ...data,
      brandName: data.brand_name || data.brandName,
      ownerName: data.owner_name || data.ownerName,
      mobile: data.mobile_number || data.mobile,
      upiId: data.upi_id || data.upiId,
      workerQuantity: data.worker_quantity || data.workerQuantity,
      status: data.status || 'pending',
      isApproved: data.status === 'active' || data.isApproved || false,
      isActive: data.status === 'active' || data.isActive || false,
      services: data.services || []
    };
  } catch (err) {
    console.error('Firestore fetch error:', err);
    return null;
  }
};

export const addShop = async (shop: any) => {
  try {
    const payload = {
      owner_name: shop.ownerName,
      mobile_number: shop.mobile,
      brand_name: shop.brandName,
      category: shop.category,
      worker_quantity: shop.workerQuantity,
      status: 'pending',
      onboarded_at: new Date().toISOString(),
      services: shop.services || [],
      password: shop.password
    };

    const docRef = await addDoc(collection(db, 'partners'), payload);
    return { id: docRef.id, ...payload };
  } catch (err) {
    console.error('Firestore insert error:', err);
    throw err;
  }
};

export const updateShop = async (id: string, updates: any) => {
  try {
    const docRef = doc(db, 'partners', id);
    // Map frontend updates to DB fields if necessary
    const dbUpdates: any = { ...updates };
    if (updates.brandName) dbUpdates.brand_name = updates.brandName;
    if (updates.ownerName) dbUpdates.owner_name = updates.ownerName;
    if (updates.mobile) dbUpdates.mobile_number = updates.mobile;
    if (updates.upiId) dbUpdates.upi_id = updates.upiId;
    if (updates.workerQuantity) dbUpdates.worker_quantity = updates.workerQuantity;

    await updateDoc(docRef, dbUpdates);
    return true;
  } catch (err) {
    console.error('Firestore update error:', err);
    return false;
  }
};

export const getBookings = async (userId?: string): Promise<any[]> => {
  try {
    let q = query(collection(db, 'bookings'));
    const querySnapshot = await getDocs(q);
    const allBookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Accountant AI Core: Settlement Timer Sync
    // This logic ensures that bookings held in escrow for > 12 hours are marked as settlement due.
    const now = new Date().getTime();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    
    const syncedBookings = await Promise.all(allBookings.map(async (b: any) => {
      const createdAt = new Date(b.createdAt).getTime();
      if (b.status === 'payment_held' && (now - createdAt) >= TWELVE_HOURS) {
        const updatedStatus = 'settlement_due';
        await updateDoc(doc(db, 'bookings', b.id), { status: updatedStatus });
        return { ...b, status: updatedStatus };
      }
      return b;
    }));
    
    if (userId) {
      return syncedBookings.filter((b: any) => b.customerId === userId || b.shopId === userId);
    }
    
    return syncedBookings;
  } catch (err) {
    console.error('Failed to get bookings from Firestore:', err);
    return [];
  }
};

export const updateBookingStatus = async (bookingId: string, newStatus: string) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    await updateDoc(docRef, { status: newStatus });
    return true;
  } catch (err) {
    console.error('Failed to update booking status in Firestore:', err);
    return false;
  }
};

export const addBooking = async (booking: any) => {
  try {
    const newBooking = {
      ...booking,
      createdAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, 'bookings'), newBooking);
    return { id: docRef.id, ...newBooking };
  } catch (err) {
    console.error('Failed to add booking to Firestore:', err);
    return null;
  }
};

export const updateBooking = async (bookingId: string, updates: any) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.error('Failed to update booking in Firestore:', err);
    return false;
  }
};

export const getSettings = async (): Promise<any> => {
  try {
    const configRef = doc(db, 'settings', 'global_config');
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      const configData = configSnap.data();
      if (configData.platformFee !== undefined) {
        return configData;
      }
    }

    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    
    // Default settings
    const defaultSettings = { platformFee: 10, broadcasts: [] };
    await setDoc(docRef, defaultSettings);
    return defaultSettings;
  } catch (err) {
    console.error('Failed to get settings from Firestore:', err);
    return { platformFee: 10, broadcasts: [] };
  }
};

export const updateSettings = async (updates: any) => {
  try {
    const docRef = doc(db, 'settings', 'global');
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.error('Failed to update settings in Firestore:', err);
    return false;
  }
};

export const updateShopPassword = async (mobile: string, newPassword: string): Promise<any> => {
  try {
    const q = query(collection(db, 'partners'), where('mobile_number', '==', mobile));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) throw new Error('Partner not found');
    
    const partnerDoc = querySnapshot.docs[0];
    const docRef = doc(db, 'partners', partnerDoc.id);
    
    await updateDoc(docRef, { password: newPassword });
    return { id: partnerDoc.id, ...partnerDoc.data(), password: newPassword };
  } catch (err) {
    console.error('Firestore password update error:', err);
    throw err;
  }
};
