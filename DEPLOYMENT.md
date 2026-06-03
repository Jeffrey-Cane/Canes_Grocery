# Deployment Guide

This project has a static frontend in `main/` and a Node/Express backend in `backend/`.
The backend now serves the frontend automatically, so you can deploy a single Node service.

## Required environment variables
Create `backend/.env` with:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_API_KEY=your-firebase-web-api-key
JWT_SECRET=replace-with-a-strong-secret
PORT=3000
```

## Local testing
1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create `backend/.env` from `backend/.env.example`.
3. Start the server:
   ```bash
   npm start
   ```
4. Open the app in your browser:
   ```
   http://localhost:3000
   ```

## Recommended hosting options

### Option A: Render
1. Create a new Web Service.
2. Connect your GitHub repository.
3. Set the `Root Directory` to the repo root.
   - The app is served by the backend from `backend/server.js`, and this backend serves the static frontend from `main/`.
4. Build command:
   ```bash
   cd backend && npm install
   ```
5. Start command:
   ```bash
   cd backend && npm start
   ```
6. Add the environment variables from `backend/.env.example` in Render.

> If you instead set Render’s `Root Directory` to `backend`, then use this build/start config:
>
> Build command:
> ```bash
> npm install
> ```
>
> Start command:
> ```bash
> npm start
> ```
> 
> In that case do not use `cd backend` because the service is already running from the `backend` folder.

### Option B: Railway or similar
1. Create a new service.
2. Use the repo root.
3. Set install/start commands like Render.
4. Add the same environment variables.

## Notes
- The backend serves the static frontend from `main/`.
- API endpoints are now available at `/api`.
- If you later want to host `main/` separately, add a meta tag or set `window.__CANE_API_URL` to your backend URL.
