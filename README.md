# KGL Frontend

## Setup
### One-click start (Windows)
- Run `start-kgl.bat` from this folder.
- It starts backend on `4000` and frontend on `5500`.
- Login URL: `http://localhost:5500/pages/login.html`
- To stop both, run `stop-kgl.bat`.

### Manual start
1. Ensure backend is running first:
   - Folder: `C:\Users\USER\Desktop\karibu-groceries-ltmd\kgl-backend`
   - Command: `npm run dev`
2. Start a static server from frontend folder:
   - Folder: `C:\Users\USER\Desktop\karibu-groceries-ltmd\kgl-frontend`
   - Example: `npx serve .`
   - Or use VS Code Live Server
3. Open login page:
   - `pages/login.html`

## API Base
- Frontend uses:
  - `http://localhost:4000/api`
- Config file:
  - `js/api.js`
 - Quick toggle (optional):
   - `?api=local` (force local backend)
   - `?api=render` (force Render backend)
   - `?api=clear` (clear override)

## Authentication
- Login is backend-authenticated.
- JWT token is stored in browser `localStorage` as part of `kgl_user`.
- Protected API calls send:
  - `Authorization: Bearer <token>`

## Demo Credentials
- Demo usernames:
  - `manager`
  - `attendant1`
  - `attendant2`
  - `orban`
- Default password for all demo users: `kgl123`

## Backend Shortcut
- When `kgl-frontend` and `kgl-backend` are in the same repo, the backend also serves the frontend.
- Open `http://localhost:4000/` or `http://localhost:4000/pages/login.html`.

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
