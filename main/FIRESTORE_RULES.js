/* ============================================
   FIRESTORE SECURITY RULES - PRODUCTION
   Apply these rules in Firebase Console
   ============================================ */

// Go to: Firebase Console → Firestore Database → Rules tab
// Replace the existing rules with the code below:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{uid} {
      // Allow user creation during registration (server-side auth creates it)
      allow create: if true;

      // Users can read their own profile
      allow read: if request.auth.uid == uid;

      // Users can update their own profile
      allow update: if request.auth.uid == uid;

      // Admins can read all user profiles
      allow read, list: if request.auth.token.admin == true;
    }

    // Orders collection
    match /orders/{orderId} {
      // Users can read their own orders
      allow read, list: if request.auth.uid == resource.data.userId;

      // Users can create orders for themselves
      allow create: if request.auth.uid != null &&
                       request.auth.uid == request.resource.data.userId;

      // Users can update their own orders
      allow update: if request.auth.uid == resource.data.userId;

      // Admins can read all orders
      allow read, list: if request.auth.token.admin == true;

      // Admins can update any order (e.g., update status)
      allow update: if request.auth.token.admin == true;
    }

    // Products collection - Public read, admin write
    match /products/{document=**} {
      allow read, list: if true;
      allow write: if request.auth.token.admin == true;
    }

    // Default deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
