# KGL Frontend

## Setup
1. Ensure backend is running first:
   - Folder: `C:\Users\USER\Desktop\kgl-backend`
   - Command: `npm run dev`
2. Start a static server from frontend folder:
   - Folder: `C:\Users\USER\Desktop\kgl-frontend`
   - Example: `npx serve .`
   - Or use VS Code Live Server
3. Open login page:
   - `pages/login.html`

## API Base
- Frontend uses:
  - `http://localhost:4000/api`
- Config file:
  - `js/api.js`

## Authentication
- Login is backend-authenticated.
- JWT token is stored in browser `localStorage` as part of `kgl_user`.
- Protected API calls send:
  - `Authorization: Bearer <token>`

## Demo Credentials
- `manager / kgl123`
- `attendant1 / kgl123`
- `attendant2 / kgl123`
- `orban / kgl123`

## Dashboard Routing by Role
- `manager` -> `pages/manager-dashboard.html`
- `agent` (`attendant1`, `attendant2`) -> `pages/agent-dashboard.html`
- `director` (`orban`) -> `pages/director-dashboard.html`

## Core Features Implemented
- Role-based dashboards and page access
- Procurement records
- Sales records
- Credit sales records
- Credit payment recording
- Credit payment history modal
- Director reports summary + stock report

## Demo Flow (Submission)
1. Log in as manager -> save procurement.
2. Save a normal sale.
3. Save a credit sale.
4. Record partial payment and open `View Payments`.
5. Log in as director -> open reports/dashboard.
6. Log in as agent (`attendant1` or `attendant2`) -> use agent dashboard.

## Notes
- If login or API fails, confirm backend is running on port `4000`.
- After auth changes, use hard refresh (`Ctrl+F5`) and log in again.
