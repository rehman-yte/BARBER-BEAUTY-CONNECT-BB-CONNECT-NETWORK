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
  },
  {
    id: 'shop2',
    brandName: 'Glamour Queen Studio',
    ownerName: 'Priya Sharma',
    category: 'Beauty Parlour',
    isVerified: true,
    isApproved: true,
    isActive: true,
    status: 'Active',
    onboardedAt: new Date().toISOString(),
    upiId: 'priya@upi',
    shopImages: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600'],
    workers: [
      { name: 'Simran', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop' }
    ],
    services: [
      { name: 'Bridal Makeup', price: 2500 },
      { name: 'Facial Glow', price: 1200 },
      { name: 'Hair Spa', price: 800 }
    ],
    bookings: []
  },
  {
    id: 'shop3',
    brandName: 'Verve Unisex Salon & Studio',
    ownerName: 'Kabir & Meera',
    category: 'Unisex Salon',
    isVerified: true,
    isApproved: true,
    isActive: true,
    status: 'Active',
    onboardedAt: new Date().toISOString(),
    upiId: 'verve@upi',
    shopImages: ['https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&q=80&w=600'],
    workers: [
      { name: 'Rohan', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop' },
      { name: 'Ananya', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop' }
    ],
    services: [
      { name: 'Global Hair Color', price: 2200 },
      { name: 'Keratin Treatment', price: 3500 },
      { name: 'Designer Cut & Style', price: 750 }
    ],
    bookings: []
  },
  {
    id: 'shop4',
    brandName: 'Aura Holistic Spa Corners',
    ownerName: 'Sanjay Dutt',
    category: 'Spa Corners',
    isVerified: true,
    isApproved: true,
    isActive: true,
    status: 'Active',
    onboardedAt: new Date().toISOString(),
    upiId: 'auraspa@upi',
    shopImages: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600'],
    workers: [
      { name: 'Dev', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop' }
    ],
    services: [
      { name: 'Swedish Body Massage', price: 1800 },
      { name: 'Aroma Therapy', price: 2100 },
      { name: 'Herbal Detox Foot Spa', price: 900 }
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
