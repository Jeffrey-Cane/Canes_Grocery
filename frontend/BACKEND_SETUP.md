# Backend Setup Guide - Firebase

## Step 3: Set Firestore Security Rules

1. Go to **Firebase Console** → Select your project
2. Left sidebar → **Firestore Database**
3. Click **Rules** tab
4. Replace all the default rules with the code from `FIRESTORE_RULES.js`
5. Click **Publish**

---

## Step 4: Create Admin User

You'll need to create your first admin account:

### Option A: Firebase Console (Recommended for first time)
1. Go to **Firebase Console** → **Authentication**
2. Click **Add user** (top right)
3. Email: `admin@canesstore.com`
4. Password: Create a strong password (you'll use this to login)
5. Click **Add user**

### Option B: Via Login Page
1. Open your app at `login.html`
2. Register a new account with: `admin@canesstore.com`
3. Then manually promote that user to admin (see next section)

---

## Step 5: Promote User to Admin

Run this in your browser console on **any page of your app** (after you're logged in):

```javascript
// Make current user an admin
firebase.auth().currentUser.getIdTokenResult().then(idTokenResult => {
  if (!idTokenResult.claims.admin) {
    console.log('Making user admin...');
    // This requires a Cloud Function (we'll create this next if needed)
    fetch('/admin/makeAdmin', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + idTokenResult.token }
    }).then(res => res.json()).then(data => console.log(data));
  } else {
    console.log('User is already admin');
  }
});
```

**Alternative (Direct Firestore):**
1. Go to **Firebase Console** → **Firestore Database**
2. Click **Collections** → **users**
3. Click on the admin user document
4. Add a new field:
   - Field: `role`
   - Type: `string`
   - Value: `admin`
5. Click **Save**

---

## Step 6: Enable Custom Claims (For admins)

To properly verify admin roles, create a **Cloud Function**:

1. Go to **Firebase Console** → **Functions** (left sidebar)
2. Click **Get Started**
3. Choose **JavaScript** when prompted
4. Create a `/setAdminRole` function (we can provide the code if needed)

**For now:** The simpler approach is storing `role: 'admin'` in the Firestore user document (done above).

---

## What's Next

Once you complete steps 3 & 5:
- Test login at `login.html`
- Access admin dashboard at `admin.html` (only if logged in as admin)
- Orders will be saved to Firestore (no longer localStorage)

