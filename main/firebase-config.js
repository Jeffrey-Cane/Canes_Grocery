/* ============================================
   FIREBASE CONFIGURATION - COMPAT API
   Using Firebase Compat (simpler, backward compatible)
   ============================================ */

// ⬇️ YOUR FIREBASE CONFIG ⬇️
const firebaseConfig = {
  apiKey: "AIzaSyB9MZrEcECG5oUXeuKPSsJ2IX6PGaREGSE",
  authDomain: "canes-grocery-store.firebaseapp.com",
  projectId: "canes-grocery-store",
  storageBucket: "canes-grocery-store.firebasestorage.app",
  messagingSenderId: "5422349686",
  appId: "1:5422349686:web:b51336d1aa3e9524368e57",
  measurementId: "G-K1ZRPEV7XD"
};
// ⬆️ YOUR FIREBASE CONFIG ⬆️

// Initialize Firebase - Wait for SDK to load
console.log('Waiting for Firebase SDK (compat)...');

function initializeFirebase() {
  if (typeof firebase === 'undefined' || !firebase.initializeApp) {
    console.log('Firebase SDK not ready, waiting...');
    setTimeout(initializeFirebase, 100);
    return;
  }

  console.log('Firebase SDK found, initializing with compat API...');

  try {
    // Initialize Firebase
    const app = firebase.initializeApp(firebaseConfig);

    // Get services using compat API
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Enable offline persistence
    db.enablePersistence()
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.log('Multiple tabs open, offline persistence disabled');
        } else if (err.code === 'unimplemented') {
          console.log('This browser does not support offline persistence');
        }
      });

    // Export services using compat API
    window.Firebase = { auth, db, app };
    console.log('✓ Firebase initialized successfully (compat API)');
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Start initialization
initializeFirebase();


