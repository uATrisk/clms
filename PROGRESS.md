# Project Progress Tracker

## Current Phase
**Phase 1: Setup, Database Schema, Core API & Student Interface** (Not Started)

---

## Phase Checklist

### Phase 1: Database Schema, Core API & Student Interface
- [ ] **Database Setup & Prisma Schema**
  - [ ] Configure PostgreSQL connection
  - [ ] Implement `students` model
  - [ ] Implement `orders` model
  - [ ] Implement `staff` model
  - [ ] Implement `complaints` model
  - [ ] Implement `status_history` model
  - [ ] Implement `notifications_log` model
  - [ ] Run initial migrations & generate Prisma client
- [ ] **Backend Core & Auth API**
  - [ ] Set up Express + TypeScript boilerplate with error handling & logging
  - [ ] Implement Staff/Admin JWT Authentication (`POST /api/auth/login`)
  - [ ] Implement Public Order Submission (`POST /api/orders`)
  - [ ] Implement Public Order Tracking API (`GET /api/orders/track/:orderCode`)
  - [ ] Implement `status_history` auto-logging middleware/utility
- [ ] **Frontend: Student UI (Public)**
  - [ ] Set up React + Vite + Tailwind + shadcn/ui framework
  - [ ] Build Landing Page (Track / Submit navigation)
  - [ ] Build Registration-Free Laundry Submission Form
  - [ ] Build Real-Time Order Tracking Page (`/track/:orderCode`)
  - [ ] Integrate React Query for polling status updates

---

### Phase 2: Washer & Collection Dashboards, Status Lifecycle & OTP Flow
- [ ] **Washer Dashboard**
  - [ ] Staff Login View
  - [ ] Live incoming requests queue (`GET /api/staff/orders/queue`)
  - [ ] Order Acceptance & dual-count verification UI (`PATCH /api/staff/orders/:id/accept`)
  - [ ] Count mismatch auto-flagging logic
  - [ ] Status updates: Processing (`PATCH /api/staff/orders/:id/status`) with Expected Date setting
  - [ ] Status update: Mark Ready (triggers OTP generation)
  - [ ] Bulk status update feature
- [ ] **Collection Center Dashboard**
  - [ ] Search Orders by Bag Number / College ID / Mobile (`GET /api/staff/orders/search`)
  - [ ] Collection OTP verification & count returned verification (`PATCH /api/staff/orders/:id/collect`)
  - [ ] Manual override with Admin PIN support

---

### Phase 3: Complaints Module & Notifications Integration
- [ ] **Complaints System**
  - [ ] Public complaint submission endpoint (`POST /api/orders/:orderCode/complaint`)
  - [ ] Student-facing "Raise Complaint" form with category selection
  - [ ] Cloudinary/S3 integration for photo proof upload
  - [ ] Admin complaint queue API (`GET /api/admin/complaints`)
  - [ ] Admin complaint resolution endpoint (`PATCH /api/admin/complaints/:id`)
- [ ] **Notifications Service**
  - [ ] Pluggable SMS/Notification service adapter (Twilio / MSG91 / Fast2SMS)
  - [ ] Notification triggers on order submission, acceptance, delay, and ready for pickup
  - [ ] OTP dispatch mechanism via SMS
  - [ ] `notifications_log` logging for all outbound alerts

---

### Phase 4: Admin Dashboard, Analytics & Export
- [ ] **Admin Management & Controls**
  - [ ] Staff account management CRUD (`POST/PATCH /api/admin/staff`)
  - [ ] Master order view with filters by status, date, and hostel block (`GET /api/admin/orders`)
- [ ] **Analytics & Reporting**
  - [ ] Analytics backend aggregation (`GET /api/admin/analytics/summary`)
  - [ ] Analytics UI: Turnaround time, peak submission hours, complaint frequency
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
*(No tasks executed yet — repository initialized and memory system configured.)*
