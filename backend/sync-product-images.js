/**
 * One-off sync: push image (and emoji) fields from frontend/products.json
 * into the Firestore products collection.
 *
 * Usage: node sync-product-images.js
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const admin = require('firebase-admin');

const productsPath = path.join(__dirname, '..', 'frontend', 'products.json');

function initFirebase() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  };
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  return admin.firestore();
}

async function syncProductImages() {
  const raw = fs.readFileSync(productsPath, 'utf-8');
  const products = JSON.parse(raw);
  if (!Array.isArray(products)) {
    throw new Error('products.json must be an array');
  }

  const db = initFirebase();
  const batch = db.batch();
  let updated = 0;

  for (const p of products) {
    const docId = String(p.id);
    const ref = db.collection('products').doc(docId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  skip id ${docId} (${p.name}) — no Firestore doc`);
      continue;
    }

    const updates = { image: p.image || '' };
    if (p.emoji !== undefined) updates.emoji = p.emoji;

    batch.update(ref, updates);
    const before = snap.data().image || '(empty)';
    const after = updates.image || '(empty)';
    console.log(`  ${docId} ${p.name}: ${before} → ${after}`);
    updated++;
  }

  if (updated === 0) {
    console.log('No documents to update.');
    return;
  }

  await batch.commit();
  console.log(`\nDone — updated ${updated} product(s) in Firestore.`);
}

syncProductImages().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
