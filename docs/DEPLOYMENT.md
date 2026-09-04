# Cloud Deployment Guide (Vercel, Render & Neon)

This document provides preparation and configuration instructions for deploying the College Laundry Management System (CLMS).

---

## 1. Architecture Overview
- **Frontend Host:** [Vercel](https://vercel.com) (Single Page Application / Vite + React)
- **Backend Host:** [Render](https://render.com) (Node.js + Express Web Service)
- **Database:** [Neon](https://neon.tech) (Serverless PostgreSQL)

---

## 2. Frontend Configuration (Vercel)

### Project Settings
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build` (or `tsc -b && vite build`)
- **Output Directory:** `dist`

### Environment Variables
Set these variables in the **Vercel Project Settings > Environment Variables**:
| Variable Name | Description | Example / Note |
|---|---|---|
| `VITE_API_URL` | Public URL of the deployed Render backend API | `https://your-backend.onrender.com/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID for `@rishihood.edu.in` sign-in | `898768390305-xxxx.apps.googleusercontent.com` |

---

## 3. Backend Configuration (Render)

### Service Settings
- **Service Type:** Web Service
- **Environment:** Node
- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run prisma:generate && npm run build`
- **Start Command:** `npm start` (executes `node dist/index.js`)
- **Host & Port Behavior:** The server binds automatically to `0.0.0.0` and listens on `process.env.PORT` provided by Render.

### Environment Variables
Set these variables in the **Render Service Dashboard > Environment**:
| Variable Name | Description | Source / Action |
|---|---|---|
| `NODE_ENV` | Runtime environment | Set to `production` |
| `PORT` | Web service port | Handled automatically by Render (default 10000) |
| `DATABASE_URL` | Neon pooled connection string | Copy from Neon Dashboard (pooled connection endpoint) |
| `DIRECT_URL` | Neon direct connection string | Copy from Neon Dashboard (direct connection endpoint) |
| `JWT_SECRET` | Secret key for signing Staff/Admin session tokens | Generate a cryptographically secure random string |
| `JWT_EXPIRES_IN` | Staff/Admin token lifespan | e.g., `7d` |
| `CORS_ORIGIN` | Allowed frontend origin(s) | `https://your-frontend.vercel.app` (or comma-separated) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for server-side ID token validation | Match `VITE_GOOGLE_CLIENT_ID` |
| `ADMIN_PIN` | Shared secret PIN for emergency manual collection override | Set a strong secret PIN |

> **CRITICAL SECURITY WARNING:**
> The `SEED_ALLOW_DESTRUCTIVE` variable must **NEVER** be set to `"true"` on a production deployment. The development seed script (`npm run seed`) wipes database tables and is strictly intended for local sandboxes.

---

## 4. Database Setup (Neon)

- Continue utilizing the provisioned Neon PostgreSQL instance.
- **Prisma Migrations:** In production, apply migrations safely using:
  ```bash
  npx prisma migrate deploy
  ```
  *(Do not use `prisma migrate dev` or `prisma db push` in production).*

---

## 5. Pre-Deployment Verification Checklist

1. [ ] **Google OAuth Authorized Origins:** Add the Vercel production domain (`https://your-app.vercel.app`) to **Authorized JavaScript origins** and **Authorized redirect URIs** in the Google Cloud Console.
2. [ ] **CORS Synchronization:** Ensure `CORS_ORIGIN` on Render exactly matches the assigned Vercel URL.
3. [ ] **API Endpoint Suffix:** Verify `VITE_API_URL` on Vercel includes the `/api` prefix (e.g. `https://your-backend.onrender.com/api`).
