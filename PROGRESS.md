# Project Progress Tracker

## Known Issues — Must Fix Next Session
1. [RESOLVED] Enforced authenticated student JWT requirement on `POST /api/orders` and `GET /api/orders/track/:orderCode` (with ownership checks), eliminating placeholder/fake email generation entirely.
2. [RESOLVED] Fixed messy email migration by generating a clean migration file (`20260831100000_add_student_email`) matching schema definitions and marking it resolved via `prisma migrate resolve --applied`.

---

## Current Phase
**Phase 3: Complaints Module & Notifications Integration** (In Progress)

---

## Phase Checklist

### Phase 1: Database Schema, Core API & Student Interface
- [x] **Database Setup & Prisma Schema**
  - [x] Configure PostgreSQL connection
  - [x] Implement `students` model
  - [x] Implement `orders` model
  - [x] Implement `staff` model
  - [x] Implement `complaints` model
  - [x] Implement `status_history` model
  - [x] Implement `notifications_log` model
  - [x] Run initial migrations & generate Prisma client
- [x] **Backend Core & Auth API**
  - [x] Set up Express + TypeScript boilerplate with error handling & logging
  - [x] Implement Staff/Admin JWT Authentication (`POST /api/auth/login`)
  - [x] Implement Public Order Submission (`POST /api/orders`)
  - [x] Implement Public Order Tracking API (`GET /api/orders/track/:orderCode`)
  - [x] Implement `status_history` auto-logging middleware/utility
- [x] **Frontend: Student UI (Public)**
  - [x] Set up React + Vite + Tailwind + shadcn/ui framework
  - [x] Build Landing Page (Track / Submit navigation)
  - [x] Build Registration-Free Laundry Submission Form
  - [x] Build Real-Time Order Tracking Page (`/track/:orderCode`)
  - [x] Integrate React Query for polling status updates

---

### Phase 1.5: Student Auth Migration (Google OAuth)
- [x] **Backend Identity Restructure**
  - [x] Add required `@unique` `email` field to `Student` Prisma schema
  - [x] Integrate `google-auth-library` functionality
  - [x] Expose `POST /api/auth/google` for ID token verification & domain checks
  - [x] Backfill/Migrate existing test student definitions safely
  - [x] Implement Profile Completeness Support (`GET/PATCH /api/students/me` & simplified `POST /api/orders`)
  - [x] Enforce Single Active Order per Student (`GET /api/orders/my-active` & `409 Conflict` on `POST /api/orders`)
  - [x] Implement Student Order History API (`GET /api/orders/history`) with pagination & past order status filtering
- [x] **Frontend Identity Provider & Active Order Tracking**
  - [x] Implement `GoogleOAuthProvider` and frontend sign-in page (`/login`)
  - [x] Intercept `/submit` and `/track` flows with Google Auth guard (`ProtectedRoute`)
  - [x] Modify API dispatch layer to attach student JWT to requests
  - [x] Implement `/profile` management page and completeness redirection guard
  - [x] Simplify `/submit` page to single-field `selfReportedCount` submission with contextual identity preview
  - [x] Add header profile settings link for persistent identity updates
  - [x] Implement dynamic `/track` landing page with automated `GET /api/orders/my-active` redirection & empty state
  - [x] Preserve manual order code tracking at `/track/search`
  - [x] Handle `409 Conflict` in `/submit` with direct navigation link to the in-flight active order
  - [x] Apply AppShell and maroon/cream design system to an authenticated student dashboard home page
  - [x] Implement Student Order History UI page (`/history`) with pagination and past order cards
  - [x] Implement Static Help Center FAQ UI page (`/help`) inside AppShell

---

### Phase 2: Washer & Collection Dashboards, Status Lifecycle & OTP Flow
- [x] **Washer Dashboard**
  - [x] Staff Login View (`/staff/login`)
  - [x] Live incoming requests queue (`GET /api/staff/orders/queue`) & Active wash orders (`GET /api/staff/orders/active`)
  - [x] Order Acceptance & dual-count verification UI (`PATCH /api/staff/orders/:id/accept`)
  - [x] Count mismatch auto-flagging & visual alert logic
  - [x] Status updates: Processing (`PATCH /api/staff/orders/:id/status`) with Expected Date (ETA) setting
  - [x] Status update: Mark Ready with modal OTP display (`PATCH /api/staff/orders/:id/status`)
  - [x] Bulk status update feature
- [x] **Collection Center Dashboard**
  - [x] Search Orders by Bag Number / College ID / Mobile (`GET /api/staff/orders/search` & `/staff/collection` search UI)
  - [x] Collection OTP verification & count returned verification (`PATCH /api/staff/orders/:id/collect` & `/staff/collection` modal UI)
  - [x] Manual override with Admin PIN support

---

### Phase 3: Complaints Module & Notifications Integration
- [x] **Complaints System**
  - [x] Public complaint submission endpoint (`POST /api/orders/:orderCode/complaint`)
  - [x] Student-facing "Raise Complaint" form with category selection
  - [ ] Cloudinary/S3 integration for photo proof upload (Deferred — `photoUrl` left null in v1)
  - [x] Admin complaint queue API (`GET /api/admin/complaints`)
  - [x] Admin complaint resolution endpoint (`PATCH /api/admin/complaints/:id`)
  - [x] Admin complaint management UI tab with status filters, audit tracking, and resolution modal
- [ ] **Notifications Service**
  - [ ] Pluggable SMS/Notification service adapter (Twilio / MSG91 / Fast2SMS)
  - [ ] Notification triggers on order submission, acceptance, delay, and ready for pickup
  - [ ] OTP dispatch mechanism via SMS
  - [ ] `notifications_log` logging for all outbound alerts

---

### Phase 4: Admin Dashboard, Analytics & Export
- [x] **Admin Management & Controls**
  - [x] Staff account management CRUD (`POST/PATCH /api/admin/staff`, `GET /api/admin/staff`)
  - [x] Master order view with filters by status, date (`GET /api/admin/orders`)
  - [x] Admin Login and unified UI dashboard connecting `/admin/dashboard`, `/staff/orders`, and `/staff/collection`.
- [ ] **Analytics & Reporting**
  - [x] Analytics backend aggregation (`GET /api/admin/analytics/summary`)
  - [x] Analytics UI: Turnaround time, peak submission hours, complaint frequency
  - [ ] CSV / Excel export endpoint (`GET /api/admin/export`)
  - [ ] System settings management (default turnaround days, templates)

---

### Phase 5: Testing, Responsiveness, Polish & Deployment
- [ ] **Quality Assurance & Testing**
  - [ ] Unit & integration tests for order state machine transitions
  - [ ] End-to-end testing of the complete submission-to-collection lifecycle
  - [ ] Rate limiting on OTP and public submission endpoints
- [ ] **Responsive & Mobile Polish**
  - [ ] Mobile-first UI audit on standard Android/iOS mobile viewports
  - [ ] PWA manifest setup for lightweight installable home screen access
- [ ] **Deployment & Documentation**
  - [ ] CI/CD pipeline with GitHub Actions
  - [ ] Deployment setup for frontend (Vercel) and backend/database (Render/Railway/Supabase)
  - [ ] Staff user guide and operational runbook

---

## Last Session Summary
- **Supabase Cloud Database Setup:** Configured connection pooling (`DATABASE_URL`) on port 6543 and direct session connection (`DIRECT_URL`) on port 5432. Executed initial migration `20260830171425_init` and re-seeded test accounts.
- **Backend Core & Auth API:**
  - Implemented Staff/Admin JWT Authentication (`POST /api/auth/login`) with bcrypt verification and role-based token issuance.
  - Implemented Public Order Submission (`POST /api/orders`) with registration-free student matching/upsert, unique `LN-XXXX-XXXX` tracking code generation, and initial `SUBMITTED` status assignment.
  - Implemented Public Order Tracking (`GET /api/orders/track/:orderCode`) with phone number masking and status history audit timeline.
  - Created automatic audit trail helper `logStatusChange` writing every lifecycle transition to `status_history`.
  - Added role-based access control and JWT authentication middleware (`authenticate`, `authorize`).
- **Frontend Core Implementation (Part 1):**
  - Created rigorous Zod + React Hook Form based `/submit` page with Axios submission logic.
  - Developed highly resilient TanStack Query `/track/:orderCode` page complete with mobile-first CSS dynamic lifecycles (`clsx` & `tailwind-merge`).
- **Student Auth Architectural Shift:**
  - Decided to pivot student tracking from "mobile + bag link" proxy identity to cryptographically secured **Google OAuth** scoped to `@rishihood.edu.in`.
  - Implemented the `POST /api/auth/google` controller using `google-auth-library`.
  - Added unique `email` column to `Student` Prisma model and propagated constraint using manual postgres injection.

### How to Run Locally:
1. **Backend:** Ensure `.env` in `/backend` contains the Supabase connection strings and `JWT_SECRET`. Run `npm run prisma:generate && npm run seed` then start with `npm run dev`.
2. **Frontend:** CD into `/frontend`, run `npm install`, then start with `npm run dev`.
3. Test Backend endpoints:
   - Health check: `curl http://localhost:4000/api/health`
   - Test login: `curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"username":"washer_john","password":"Password123!"}'`
