# Render Deployment Fix

If your deployment shows "Not Found" or 404 errors, your Render configuration is incorrect.

## Fix for Existing Deployment (Already deployed but not working)

1. Go to https://render.com and open your service dashboard
2. Click **Settings** (bottom left)
3. Find **Root Directory** field and change it to `backend` (if it says repo root, change it)
4. Find **Build Command** and change it to:
   ```
   npm install
   ```
   (Remove `cd backend &&` from the beginning)
5. Find **Start Command** and change it to:
   ```
   npm start
   ```
   (Remove `cd backend &&` from the beginning)
6. Scroll down and click **Save Changes**
7. Scroll up and click **Manual Deploy** (or wait for automatic redeploy)
8. Wait 2-3 minutes for the build to complete
9. Test: https://canes-grocery.onrender.com/api/status should return JSON

## Why This Works

- **Root Directory = `backend`** tells Render to use the backend folder as the working directory
- When Root Directory is set to `backend`, you do NOT need `cd backend` in your commands
- The backend's `express.static()` serves the frontend from `../main` (parent directory)

## Verify Environment Variables

Make sure ALL these are set in Render (Settings → Environment):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_API_KEY`
- `JWT_SECRET`

## Test After Deployment

Visit these URLs to verify:
- `https://canes-grocery.onrender.com/api/status` - should return JSON status
- `https://canes-grocery.onrender.com/` - should show the grocery store UI
- `https://canes-grocery.onrender.com/login.html` - should show login page
