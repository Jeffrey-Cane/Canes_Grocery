# Canes_Grocery
Version 2 of an initially made grocery store (antigravity1.0). Focused on making improvements across the app.

## Local Run Instructions

1. Install dependencies:
   - `npm install`
   - `cd backend && npm install`
2. Start the application from the repository root:
   - `npm start`
3. Open the app in your browser:
   - `http://localhost:3000`

The root `npm start` command runs the backend server from `backend/server.js` and serves the frontend from the `frontend/` directory.

## Notes

- Backend static files are served from `frontend/` if `backend/public` is not present.
- Firebase and authentication are configured through `backend/.env`.
- If you only want to serve the frontend locally without backend API support, you can run:
  - `cd frontend && npm start`
  - then open `http://localhost:8000`
