const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'main')));

// Firebase services
let db, auth;
let productsSeeded = false;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL
};

console.log('🔧 Firebase Admin SDK Configuration:');
console.log('  projectId:', serviceAccount.projectId);
console.log('  clientEmail:', serviceAccount.clientEmail);
console.log('  privateKey exists:', !!serviceAccount.privateKey);
console.log('  privateKey length:', serviceAccount.privateKey?.length);

let firebaseInitialized = false;

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });

  // Explicitly connect to the 'default' database
  db = admin.firestore();
  db.settings({ experimentalForceLongPolling: true }); // May help with connectivity

  auth = admin.auth();

  console.log('✅ Firebase Admin SDK initialized successfully');
  console.log('✅ Firestore database connected');
  console.log('✅ Auth service connected');
  firebaseInitialized = true;
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  console.error('⚠️  App will start but Firebase features will be unavailable');
  console.error('⚠️  Make sure all Firebase environment variables are set in Render:');
  console.error('   - FIREBASE_PROJECT_ID');
  console.error('   - FIREBASE_CLIENT_EMAIL');
  console.error('   - FIREBASE_PRIVATE_KEY');
  console.error('   - FIREBASE_API_KEY');
  console.error('   - JWT_SECRET');
}


// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  if (!firebaseInitialized) {
    return res.status(503).json({ success: false, message: 'Firebase not initialized. Check server logs.' });
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.uid;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.data() || userDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

function readSeedProducts() {
  try {
    const seedPath = path.join(__dirname, '..', 'main', 'products.json');
    const raw = fs.readFileSync(seedPath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

async function ensureProductsSeeded() {
  if (productsSeeded) return;
  const snapshot = await db.collection('products').limit(1).get();
  if (!snapshot.empty) {
    productsSeeded = true;
    return;
  }
  const seed = readSeedProducts();
  if (seed.length === 0) {
    productsSeeded = true;
    return;
  }

  const batch = db.batch();
  seed.forEach((p) => {
    const id = parseInt(p.id, 10);
    const docId = Number.isFinite(id) ? String(id) : db.collection('products').doc().id;
    const ref = db.collection('products').doc(docId);
    batch.set(ref, { ...p, id: Number.isFinite(id) ? id : null });
  });
  await batch.commit();
  productsSeeded = true;
}

// ============ AUTH ROUTES ============

async function verifyEmailPassword(email, password) {
  if (!FIREBASE_API_KEY) {
    throw new Error('FIREBASE_API_KEY is missing');
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password, returnSecureToken: true })
    }
  );

  const data = await res.json();
  if (!res.ok) {
    const msg = data && data.error && data.error.message ? data.error.message : 'Invalid credentials';
    throw new Error(msg);
  }
  return data;
}

// Register
app.post('/api/auth/register', async (req, res) => {
  console.log('📝 Register request received:', { email: req.body.email, name: req.body.name });

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    console.error('❌ Missing fields:', { name: !!name, email: !!email, password: !!password });
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    console.log('🔐 Creating user in Firebase Auth...');
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name
    });

    console.log('✅ Firebase Auth user created:', userRecord.uid);

    // Create user profile in Firestore
    const userData = {
      id: userRecord.uid,
      name: name,
      email: email,
      role: 'customer',
      createdAt: new Date().toISOString(),
      phone: '',
      address: ''
    };

    console.log('💾 Saving profile to Firestore...');
    console.log('📊 Document path: users/' + userRecord.uid);
    console.log('📊 Data being saved:', userData);

    try {
      const result = await db.collection('users').doc(userRecord.uid).set(userData);
      console.log('✅ Firestore write result:', result);
      console.log('✅ Profile saved to Firestore');
    } catch (firestoreError) {
      console.error('❌ Firestore write error:', firestoreError.code, firestoreError.message);
      console.error('Full error:', firestoreError);
      throw firestoreError;
    }

    // Generate JWT token
    const token = jwt.sign({ uid: uid }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    console.log('🎫 JWT generated');

    res.status(201).json({
      success: true,
      user: userData,
      token: token
    });
  } catch (error) {
    console.error('❌ Registration error:', error.code, error.message);
    let message = 'Registration failed';
    if (error.code === 'auth/email-already-exists') {
      message = 'Email already registered';
    } else if (error.code === 'auth/invalid-password') {
      message = 'Password must be at least 6 characters';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email format';
    }
    res.status(400).json({ success: false, message: message, error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  console.log('🔑 Login request received:', { email: req.body.email });

  const { email, password } = req.body;

  if (!email || !password) {
    console.error('❌ Missing email or password');
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  try {
    const signIn = await verifyEmailPassword(email, password);
    const uid = signIn.localId;

    console.log('📖 Fetching user profile from Firestore...');
    const userDoc = await db.collection('users').doc(uid).get();

    let userData = null;
    if (!userDoc.exists) {
      const fallbackName = signIn.displayName || (email ? email.split('@')[0] : 'User');
      userData = {
        id: uid,
        name: fallbackName,
        email: email,
        role: 'customer',
        createdAt: new Date().toISOString(),
        phone: '',
        address: ''
      };
      await db.collection('users').doc(uid).set(userData);
    } else {
      userData = userDoc.data();
    }

    console.log('✅ User profile loaded:', userData.name);

    // Generate JWT token
    const token = jwt.sign({ uid: uid }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    console.log('🎫 JWT token generated');

    res.json({
      success: true,
      user: userData,
      token: token
    });
  } catch (error) {
    console.error('❌ Login error:', error.code, error.message);
    let message = 'Login failed';
    if (error.message === 'EMAIL_NOT_FOUND') message = 'Email not found';
    if (error.message === 'INVALID_PASSWORD') message = 'Incorrect password';
    if (error.message === 'FIREBASE_API_KEY is missing') message = 'Server is missing Firebase API key';
    res.status(400).json({ success: false, message: message, error: error.message });
  }
});

// Get current user (requires token)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: userDoc.data() });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ ORDER ROUTES ============

// Get user's orders (requires token)
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection('orders')
      .where('userId', '==', req.userId)
      .orderBy('createdAt', 'desc')
      .get();

    const orders = [];
    snapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    res.json({ success: true, orders: orders });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create order (requires token)
app.post('/api/orders', verifyToken, async (req, res) => {
  const { items, total } = req.body;

  if (!items || !total) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const userDoc = await db.collection('users').doc(req.userId).get();
    const userData = userDoc.data();

    const orderData = {
      userId: req.userId,
      userName: userData.name,
      userEmail: userData.email,
      items: items,
      total: total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('orders').add(orderData);

    res.status(201).json({
      success: true,
      order: { id: docRef.id, ...orderData }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ PRODUCT ROUTES ============

// Public products list
app.get('/api/products', async (req, res) => {
  try {
    await ensureProductsSeeded();
    const snapshot = await db.collection('products').orderBy('id').get();
    const products = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, products: products });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message, products: [] });
  }
});

// ============ ADMIN ROUTES ============

// Get all orders (admin only, requires token)
app.get('/api/admin/orders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .get();

    const orders = [];
    snapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    res.json({ success: true, orders: orders });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get all users (admin only, requires token)
app.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db
      .collection('users')
      .orderBy('createdAt', 'desc')
      .get();

    const users = [];
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });

    res.json({ success: true, users: users });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update order status (admin only, requires token)
app.patch('/api/admin/orders/:orderId', verifyToken, requireAdmin, async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status required' });
  }

  try {
    await db.collection('orders').doc(req.params.orderId).update({
      status: status,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Order updated' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create product (admin only)
app.post('/api/admin/products', verifyToken, requireAdmin, async (req, res) => {
  const { name, category, price, unit, badge, emoji, image } = req.body;

  if (!name || !category || !price) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const latest = await db.collection('products').orderBy('id', 'desc').limit(1).get();
    let nextId = 1;
    if (!latest.empty) {
      const last = latest.docs[0].data();
      nextId = (parseInt(last.id, 10) || 0) + 1;
    }

    const product = {
      id: nextId,
      name: name,
      category: category,
      price: parseInt(price, 10),
      unit: unit || '',
      badge: badge || '',
      emoji: emoji || '',
      image: image || ''
    };

    await db.collection('products').doc(String(nextId)).set(product);

    res.status(201).json({ success: true, product: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update product (admin only)
app.patch('/api/admin/products/:productId', verifyToken, requireAdmin, async (req, res) => {
  const { name, category, price, unit, badge, emoji, image } = req.body;
  const productId = req.params.productId;

  try {
    const ref = db.collection('products').doc(String(productId));
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (price !== undefined) updates.price = parseInt(price, 10);
    if (unit !== undefined) updates.unit = unit;
    if (badge !== undefined) updates.badge = badge;
    if (emoji !== undefined) updates.emoji = emoji;
    if (image !== undefined) updates.image = image;

    await ref.update(updates);
    const updated = await ref.get();

    res.json({ success: true, product: { id: updated.id, ...updated.data() } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete product (admin only)
app.delete('/api/admin/products/:productId', verifyToken, requireAdmin, async (req, res) => {
  const productId = req.params.productId;
  try {
    const ref = db.collection('products').doc(String(productId));
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    await ref.delete();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ STATUS & HEALTH ROUTES ============

// Status endpoint (works regardless of Firebase)
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    firebaseInitialized: firebaseInitialized,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Test Firestore connection
app.get('/api/test-firestore', async (req, res) => {
  try {
    console.log('🧪 Testing Firestore write...');
    const testRef = db.collection('_test').doc('health-check');
    await testRef.set({ timestamp: new Date().toISOString() });
    console.log('✅ Firestore write test successful');
    res.json({ success: true, message: 'Firestore is working' });
  } catch (error) {
    console.error('❌ Firestore test failed:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Fallback: serve index.html for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'main', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
