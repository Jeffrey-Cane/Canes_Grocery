const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Firebase services
let db, auth;

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
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
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

// ============ AUTH ROUTES ============

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
    const token = jwt.sign({ uid: userRecord.uid }, process.env.JWT_SECRET, {
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
    console.log('🔍 Looking up user by email in Firebase Auth...');
    // Find user by email in Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    console.log('✅ Firebase Auth user found:', userRecord.uid);

    console.log('📖 Fetching user profile from Firestore...');
    // Get user profile from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();

    if (!userDoc.exists) {
      console.error('❌ User profile not found in Firestore for UID:', userRecord.uid);
      return res.status(400).json({ success: false, message: 'User profile not found' });
    }

    const userData = userDoc.data();
    console.log('✅ User profile found:', userData.name);

    // Generate JWT token
    const token = jwt.sign({ uid: userRecord.uid }, process.env.JWT_SECRET, {
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
    if (error.code === 'auth/user-not-found') {
      message = 'Email not found';
    }
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

// ============ ADMIN ROUTES ============

// Get all orders (admin only, requires token)
app.get('/api/admin/orders', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.data() || userDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

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

// Update order status (admin only, requires token)
app.patch('/api/admin/orders/:orderId', verifyToken, async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status required' });
  }

  try {
    // Check if user is admin
    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.data() || userDoc.data().role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await db.collection('orders').doc(req.params.orderId).update({
      status: status,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Order updated' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
