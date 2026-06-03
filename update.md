# Improvements

## Backend
- Fix auth: the login endpoint does not validate passwords. With Firebase Admin, password verification is not available. Use Firebase client auth for login or switch to a custom password system (bcrypt plus your own user store).
- Recompute order totals server-side. Do not trust client totals; derive totals from trusted product prices.
- Improve admin authorization. Add role claims to tokens and enforce them in middleware instead of querying on every request.
- Reduce sensitive logging. Remove Firebase config logging details in production.
- Lock down CORS to your frontend origin.

## Frontend
- Admin dashboard data flow is broken. Make order loading async and add a missing getUsers API in the auth client.
- Replace localStorage product CRUD with Firestore or backend APIs so products are shared across users.
- Move live Paystack flow server-side. Keep public keys in config, verify payment via webhook, and create orders only after verification.
- Avoid inline CSS and script blocks in pages. Move shared styles to a dedicated stylesheet.
- Add loading and error states for product fetching and checkout actions.

## Quick wins
- Make API base URL configurable (no hardcoded localhost).
- Remove unused Firebase config or wire it correctly.
- Add form-level validation feedback for checkout and auth forms.
