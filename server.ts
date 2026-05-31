import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for Backend Database Sync
const firebaseConfig = {
  apiKey: "AIzaSyDkyxmVMMS9ABmh_VWM7VkCFTgZl6Zq1Zs",
  authDomain: "bb-connect-network-34617.firebaseapp.com",
  projectId: "bb-connect-network-34617",
  storageBucket: "bb-connect-network-34617.firebasestorage.app",
  messagingSenderId: "48595477782",
  appId: "1:48595477782:web:8b62b58aa07beb962c9c37"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const MASTER_DATA_PATH = path.join(__dirname, 'master_data.csv');
const CONFIG_PATH = path.join(__dirname, 'admin_config.json');

// Initialize config if not exists
if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ platformFee: 10, broadcasts: [] }));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Helper to read CSV
  const readMasterData = () => {
    const content = fs.readFileSync(MASTER_DATA_PATH, 'utf-8');
    const data = parse(content, {
      columns: true,
      skip_empty_lines: true,
      cast: (value, context) => {
        if (context.column === 'isActive') return value === 'true';
        if (['services', 'workers', 'bookings'].includes(context.column as string)) {
          try { return JSON.parse(value); } catch { return []; }
        }
        return value;
      }
    });

    // Accountant AI Core: Settlement Timer Sync
    const now = new Date('2026-03-06T10:11:26-08:00').getTime();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    let modified = false;

    data.forEach((shop: any) => {
      if (shop.bookings) {
        shop.bookings.forEach((b: any) => {
          const createdAt = new Date(b.createdAt).getTime();
          if (b.status === 'payment_held' && (now - createdAt) >= TWELVE_HOURS) {
            b.status = 'settlement_due';
            modified = true;
          }
        });
      }
    });

    if (modified) {
      writeMasterData(data);
    }

    return data;
  };

  // Helper to write CSV
  const writeMasterData = (data: any[]) => {
    const stringified = stringify(data, {
      header: true,
      cast: {
        boolean: (value) => String(value),
        object: (value) => JSON.stringify(value)
      }
    });
    fs.writeFileSync(MASTER_DATA_PATH, stringified);
  };

  const readConfig = () => JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const writeConfig = (config: any) => fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));

  // Admin Configuration
  const ADMIN_MOBILE = '8273865308';
  const ADMIN_SECRET = 'BB_ADMIN_SECRET_2026';

  // API Routes
  app.post('/api/login', (req, res) => {
    const { mobile, password } = req.body;
    
    // Super-User Logic
    if (mobile === ADMIN_MOBILE && password === 'TheKing1278@') {
      return res.json({ 
        success: true, 
        isAdmin: true,
        token: ADMIN_SECRET
      });
    }

    const data = readMasterData();
    const shop = data.find((s: any) => String(s.mobile) === String(mobile) && String(s.password) === String(password));
    
    if (shop) {
      const { password: _, ...safeShop } = shop as any;
      res.json({ success: true, shop: safeShop });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  // Admin Stats & Control
  app.get('/api/admin/stats', (req, res) => {
    const token = req.headers['x-admin-token'];
    if (token !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const data = readMasterData();
    const config = readConfig();
    const totalPartners = data.length;
    const pendingVerifications = data.filter((s: any) => s.status === 'pending' || !s.isApproved);
    
    // Revenue Tracker
    let totalEscrow = 0;
    let activeBookingsCount = 0;
    let totalAdminProfit = 0;
    const settlements: any[] = [];
    const auditLog: any[] = [];

    data.forEach((shop: any) => {
      let shopEscrow = 0;
      if (shop.bookings) {
        shop.bookings.forEach((b: any) => {
          const price = parseFloat(b.price || 0);
          const feePercent = parseFloat(config.platformFee || 10);
          const adminProfit = (price * feePercent) / 100.0;
          const partnerPayout = price - adminProfit;
          
          const isActive = ['Accepted', 'Confirmed', 'approved', 'payment_held', 'settlement_due'].includes(b.status);
          if (isActive) activeBookingsCount++;

          // Calculate total profit from all non-cancelled bookings
          if (b.status !== 'Cancelled' && b.status !== 'rejected') {
            totalAdminProfit += adminProfit;
          }

          auditLog.push({
            bookingId: b.id,
            partnerName: shop.brand_name || shop.brandName,
            totalPaid: price,
            platformFeeSet: feePercent,
            adminProfit: parseFloat(adminProfit.toFixed(2)),
            finalPayoutAmt: parseFloat(partnerPayout.toFixed(2)),
            timerStatus: b.status === 'payment_held' ? 'Held (Escrow)' : (b.status === 'settlement_due' ? 'Settlement Due' : 'Settled'),
            isFrozen: b.isFrozen || false,
            shopId: shop.id,
            status: b.status,
            createdAt: b.createdAt
          });

          if (b.status === 'payment_held' || b.status === 'settlement_due') {
            totalEscrow += price;
            shopEscrow += price;
          }
        });
      }

      if (shopEscrow > 0) {
        const feePercent = parseFloat(config.platformFee || 10);
        const fee = (shopEscrow * feePercent) / 100.0;
        settlements.push({
          shopId: shop.id,
          brandName: shop.brand_name || shop.brandName,
          totalAmount: parseFloat(shopEscrow.toFixed(2)),
          platformFee: parseFloat(fee.toFixed(2)),
          partnerPayout: parseFloat((shopEscrow - fee).toFixed(2)),
          status: 'pending_settlement'
        });
      }
    });

    const feePercent = parseFloat(config.platformFee || 10);
    const adminCommission = (totalEscrow * feePercent) / 100.0;

    res.json({
      totalPartners,
      pendingVerifications,
      activeBookingsCount,
      totalEscrow: parseFloat(totalEscrow.toFixed(2)),
      adminCommission: parseFloat(totalAdminProfit.toFixed(2)),
      platformFee: config.platformFee,
      broadcasts: config.broadcasts,
      settlements,
      auditLog,
      allPartners: data.map((s: any) => {
        const { password: _, ...safeShop } = s;
        return safeShop;
      })
    });
  });

  app.post('/api/admin/freeze-payout', (req, res) => {
    const token = req.headers['x-admin-token'];
    if (token !== ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });

    const { shopId, bookingId, isFrozen } = req.body;
    const data = readMasterData();
    const shopIndex = data.findIndex((s: any) => s.id === shopId);

    if (shopIndex !== -1) {
      const shop = data[shopIndex] as any;
      if (shop.bookings) {
        const bIndex = shop.bookings.findIndex((b: any) => b.id === bookingId);
        if (bIndex !== -1) {
          shop.bookings[bIndex].isFrozen = isFrozen;
          writeMasterData(data);
          return res.json({ success: true });
        }
      }
    }
    res.status(404).json({ error: 'Booking not found' });
  });

  app.post('/api/admin/config', (req, res) => {
    const token = req.headers['x-admin-token'];
    if (token !== ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });

    const { platformFee } = req.body;
    const config = readConfig();
    config.platformFee = Number(platformFee);
    writeConfig(config);
    res.json({ success: true });
  });

  app.post('/api/admin/broadcast', (req, res) => {
    const token = req.headers['x-admin-token'];
    if (token !== ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });

    const { message } = req.body;
    const config = readConfig();
    const newBroadcast = {
      id: Date.now(),
      message,
      timestamp: new Date().toISOString(),
      active: true
    };
    config.broadcasts.unshift(newBroadcast);
    if (config.broadcasts.length > 10) config.broadcasts.pop();
    writeConfig(config);
    res.json({ success: true });
  });

  app.get('/api/broadcasts', (req, res) => {
    const config = readConfig();
    res.json(config.broadcasts);
  });

  app.post('/api/admin/toggle-active', (req, res) => {
    const token = req.headers['x-admin-token'];
    if (token !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { shopId, isActive } = req.body;
    const data = readMasterData();
    const index = data.findIndex((s: any) => s.id === shopId);

    if (index !== -1) {
      (data[index] as any).isActive = isActive;
      writeMasterData(data);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Shop not found' });
    }
  });

  app.post('/api/admin/verify', (req, res) => {
    const token = req.headers['x-admin-token'];
    if (token !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { shopId, action } = req.body; // action: 'approve' | 'reject'
    const data = readMasterData();
    const index = data.findIndex((s: any) => s.id === shopId);

    if (index !== -1) {
      const shop = data[index] as any;
      if (action === 'approve') {
        shop.status = 'Active';
        shop.isVerified = true;
        shop.isApproved = true;
        shop.isActive = true; // Ensure active on approval
      } else {
        shop.status = 'rejected';
        shop.isVerified = false;
        shop.isApproved = false;
        shop.isActive = false;
      }
      writeMasterData(data);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Shop not found' });
    }
  });

  app.post('/api/signup/partner', (req, res) => {
    const shop = req.body;
    const data = readMasterData();
    
    // Check for existing mobile number
    const exists = data.find((s: any) => String(s.mobile) === String(shop.mobile));
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Account already exists. Please Login.' 
      });
    }

    // Generate new ID
    const newId = `shop${data.length + 1}`;
    const newShop = {
      ...shop,
      id: newId,
      isActive: true,
      status: 'pending',
      isVerified: false,
      isApproved: false,
      onboardedAt: new Date().toISOString(),
      bookings: [],
      services: shop.services || [],
      workers: shop.workers || []
    };

    data.push(newShop);
    writeMasterData(data);
    
    const { password: _, ...safeShop } = newShop as any;
    res.json({ success: true, shop: safeShop });
  });

  app.get('/api/shop/:id', (req, res) => {
    const data = readMasterData();
    const shop = data.find((s: any) => s.id === req.params.id);
    if (shop) {
      const { password: _, ...safeShop } = shop as any;
      
      // Accountant AI Core: Real-time financial summary
      let confirmedAmount = 0;
      let escrowAmount = 0;
      
      if ((shop as any).bookings) {
        (shop as any).bookings.forEach((b: any) => {
          const price = parseFloat(b.price || 0);
          if (b.status === 'settlement_due') {
            confirmedAmount += price;
          } else if (b.status === 'payment_held') {
            escrowAmount += price;
          }
        });
      }

      res.json({ 
        ...safeShop,
        accountantAI: {
          confirmedAmount: parseFloat(confirmedAmount.toFixed(2)),
          escrowAmount: parseFloat(escrowAmount.toFixed(2))
        }
      });
    } else {
      res.status(404).json({ message: 'Shop not found' });
    }
  });

  app.post('/api/shop/:id/update', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const data = readMasterData();
    const index = data.findIndex((s: any) => s.id === id);
    
    if (index !== -1) {
      data[index] = { ...(data[index] as any), ...updates };
      writeMasterData(data);
      res.json({ success: true });
    } else {
      res.status(404).json({ message: 'Shop not found' });
    }
  });

  app.get('/api/shops', (req, res) => {
    const data = readMasterData();
    const safeShops = data.map((shop: any) => {
      const { password: _, ...s } = shop;
      return s;
    });
    res.json(safeShops);
  });

  // Razorpay Order Creation and Verification API
  const razorpayKeyId = (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'null') 
    ? process.env.RAZORPAY_KEY_ID 
    : 'rzp_test_SvrVkSoTGGlNX1';
  const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET !== 'null') 
    ? process.env.RAZORPAY_KEY_SECRET 
    : 'xdOTXQYun04VJSN92LkU9BDk';

  let razorpayInstance: any = null;
  const getRazorpayInstance = () => {
    if (!razorpayInstance) {
      const RazorpayClass = (Razorpay as any).default || Razorpay;
      razorpayInstance = new RazorpayClass({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });
    }
    return razorpayInstance;
  };

  app.post('/api/create-order', async (req, res) => {
    console.log(`[API CREATE-ORDER] Incoming request body:`, req.body);
    try {
      const { amount, currency = 'INR', type } = req.body;
      
      if (!amount || amount < 100) {
        console.warn(`[API CREATE-ORDER] Rejected order for insufficient amount: ${amount}`);
        return res.status(400).json({ success: false, error: 'Amount must be valid and >= 100 paise (1 INR)' });
      }

      const razorpay = getRazorpayInstance();
      const options = {
        amount: Math.round(amount), // must be in paise
        currency,
        receipt: `receipt_order_${Date.now()}`,
        notes: {
          checkout_type: type || 'shopping_checkout'
        }
      };

      console.log(`[API CREATE-ORDER] Creating Razorpay order with options:`, options);
      const order = await razorpay.orders.create(options);
      console.log(`[API CREATE-ORDER] Successfully created Razorpay order:`, order.id);

      res.json({
        success: true,
        order_id: order.id,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      });
    } catch (err: any) {
      console.error('Error in /api/create-order:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to create Razorpay order' });
    }
  });

  app.post('/api/verify-payment', async (req: any, res: any) => {
    try {
      const { 
        razorpay_payment_id, 
        razorpay_order_id, 
        razorpay_signature,
        bookingDocIds,
        orderDocId
      } = req.body;

      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Missing standard verification parameters' });
      }

      // Re-create the HMAC-SHA256 signature to verify authenticity
      const text = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(text)
        .digest('hex');

      const isVerified = (expectedSignature === razorpay_signature);

      if (!isVerified) {
        return res.status(400).json({ success: false, error: 'Signature verification failure: authentication mismatch.' });
      }

      // Update Firestore documents in background since verified successfully
      try {
        if (orderDocId) {
          const oRef = doc(db, 'orders', orderDocId);
          await updateDoc(oRef, {
            paymentStatus: 'paid',
            status: 'confirmed',
            paymentMethodDetail: razorpay_payment_id
          });
        }

        if (bookingDocIds && Array.isArray(bookingDocIds)) {
          for (const bid of bookingDocIds) {
            const bRef = doc(db, 'bookings', bid);
            await updateDoc(bRef, {
              paymentStatus: 'paid',
              bookingStatus: 'confirmed',
              status: 'confirmed',
              transactionId: razorpay_payment_id
            });
          }
        }

        // Backwards compatible fallback query using Razorpay order ID
        const qOrders = query(collection(db, 'orders'), where('razorpayOrderId', '==', razorpay_order_id));
        const ordersSnap = await getDocs(qOrders);
        for (const docSnap of ordersSnap.docs) {
          await updateDoc(doc(db, 'orders', docSnap.id), {
            paymentStatus: 'paid',
            status: 'confirmed',
            paymentMethodDetail: razorpay_payment_id
          });
        }
        
        const qBookings = query(collection(db, 'bookings'), where('razorpayOrderId', '==', razorpay_order_id));
        const bookingsSnap = await getDocs(qBookings);
        for (const docSnap of bookingsSnap.docs) {
          await updateDoc(doc(db, 'bookings', docSnap.id), {
            paymentStatus: 'paid',
            bookingStatus: 'confirmed',
            status: 'confirmed',
            transactionId: razorpay_payment_id
          });
        }
      } catch (dbErr: any) {
        console.error('Verified payment but failed to sync to Firestore:', dbErr);
      }

      res.json({ success: true, paymentId: razorpay_payment_id });
    } catch (err: any) {
      console.error('Error in /api/verify-payment:', err);
      res.status(500).json({ success: false, error: err.message || 'Signature verification failure' });
    }
  });

  // PREVENT HTML FALLBACK FOR API: Any unmatched API route must return a 404 JSON response
  app.all('/api/*all', (req, res) => {
    console.warn(`[API 404 RESCUE] Unmatched API route requested: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'API route not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
