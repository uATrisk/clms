# College Laundry Management System (CLMS)
### Technical Specification & System Design Document

---

## 1. Overview

**Project Name:** College Laundry Management System (CLMS)

**Type:** Registration-free web application

**Goal:** Replace the manual, untracked college laundry process with a transparent, trackable, and verifiable digital system connecting students, laundry staff (washers), and the collection center — without requiring app installs, QR hardware, or student account creation.

**Core Identity Key:** Bag Number (already assigned to every student physically) + Mobile Number, used together as a lightweight, registration-free identity/verification pair.

---

## 2. Goals & Non-Goals

### Goals
- Let students submit a laundry request online in under 1 minute, with no login/signup.
- Let washer staff verify, count, and update laundry status from a simple dashboard.
- Give students real-time visibility into their laundry status.
- Prevent unauthorized collection through OTP/Bag+Mobile verification.
- Provide a structured complaint and delay-reporting system.
- Reduce collection-center crowding via "Ready" notifications instead of walk-in checking.
- Maintain a full digital history/audit trail of every bag, count, and status change.

### Non-Goals (explicitly out of scope for v1)
- No native mobile app (mobile-responsive web only).
- No QR code / RFID / barcode hardware.
- No payment/billing integration (assumed laundry is a free/included college service; can be added later as a module).
- No machine-level tracking (which washing machine, cycle number, etc.).

---

## 3. User Roles

| Role | Access | Description |
|---|---|---|
| **Student** | Public, no login | Submits requests, tracks status, reports issues, confirms collection |
| **Washer / Laundry Staff** | Staff login (PIN or username/password) | Accepts requests, enters actual clothing count, updates status |
| **Collection Center Staff** | Staff login | Verifies student identity, marks laundry as Collected |
| **Admin / Warden** | Admin login | Manages staff accounts, views all records, resolves complaints, views analytics |

> Note: In small colleges, Washer and Collection Center Staff roles can be merged into a single "Staff" role. Kept separate here for clarity and scalability.

---

## 4. Registration-Free Identity Model

Since there's no student login, identity is established using a combination of:

1. **Bag Number** (e.g., 320) — physical, pre-assigned, unique per student for the laundry service.
2. **Mobile Number** — used for OTP verification and SMS/WhatsApp notifications.
3. **College ID (optional but recommended)** — secondary identity check, especially for complaint verification and duplicate-bag-number cases (e.g., across hostels/blocks).

**Session handling:** After submitting a request, the student receives a **Tracking Link + OTP** via SMS (e.g., `clms.college.edu/track/8842-ab3f`). This link is bookmarkable and lets them check status anytime without logging in — a "magic link" pattern instead of authentication.

**Verification at collection:** Student provides Bag Number + last 4 digits of mobile OR a one-time collection OTP sent when status becomes "Ready for Collection." Staff enters this OTP in their dashboard before marking Collected.

This keeps the system frictionless for students while still preventing unauthorized pickup.

---

## 5. End-to-End Workflow (Detailed)

```
┌─────────────┐
│   STUDENT    │  Submits: Name, College ID, Bag No, Mobile, Self-Counted Cloth Count
└──────┬──────┘
       │  → System creates Order (status: SUBMITTED) + sends Tracking Link SMS
       ▼
┌─────────────┐
│   WASHER     │  Physically receives Bag #320
│  DASHBOARD   │  Counts clothes → enters Verified Count
└──────┬──────┘
       │  If Self-Count ≠ Verified Count → auto-flag "Count Mismatch" for review
       │  Washer clicks "Accept Request" → status: ACCEPTED
       ▼
┌─────────────┐
│  PROCESSING  │  status: PROCESSING (wash + dry + press)
│              │  Washer sets Expected Ready Date (e.g., +2 days)
└──────┬──────┘
       │  Student receives SMS: "Your laundry is being processed. Expected: DD/MM"
       │  (Optional) Washer can update sub-stage: Washing → Drying → Pressing
       ▼
┌─────────────┐
│ READY FOR    │  Washer clicks "Mark Ready" → status: READY
│ COLLECTION   │  System generates Collection OTP → sent via SMS
└──────┬──────┘
       │  Student receives SMS: "Ready! Bring Bag #320 + OTP 4821 to collect"
       ▼
┌─────────────┐
│  COLLECTION  │  Student shows Bag No / College ID / OTP
│   CENTER     │  Staff verifies in dashboard → enters OTP → confirms count returned
└──────┬──────┘
       │  Staff clicks "Confirm Collected" → status: COLLECTED
       ▼
┌─────────────┐
│  COLLECTED   │  Order archived, added to student's history log (via Bag No)
└─────────────┘

     ⚠ Parallel path at any stage:
     Student can raise → DELAYED flag or COMPLAINT (missing/damaged/wrong laundry)
     → routed to Admin dashboard → Admin resolves → status: RESOLVED / ESCALATED
```

---

## 6. Order Status Lifecycle (State Machine)

| Status | Set By | Meaning | Next Possible States |
|---|---|---|---|
| `SUBMITTED` | Student | Request created, awaiting pickup by washer | `ACCEPTED`, `CANCELLED` |
| `ACCEPTED` | Washer | Bag physically received & counted | `PROCESSING` |
| `PROCESSING` | Washer | Wash/dry/press in progress | `READY`, `DELAYED` |
| `DELAYED` | Washer or System (auto if past expected date) | Past expected date, new ETA set | `PROCESSING`, `READY` |
| `READY` | Washer | Ready for pickup, OTP generated | `COLLECTED` |
| `COLLECTED` | Collection Staff | Verified handover complete | *(terminal)* |
| `COMPLAINT_RAISED` | Student | Issue reported (can be raised from any active status) | `UNDER_REVIEW` |
| `UNDER_REVIEW` | Admin | Investigating complaint | `RESOLVED`, `ESCALATED` |
| `RESOLVED` | Admin | Complaint closed | *(terminal)* |
| `CANCELLED` | Student/Admin | Order withdrawn before acceptance | *(terminal)* |

---

## 7. Feature List

### 7.1 Student-Facing Features
- Submit laundry request (no login)
- Auto-SMS with tracking link + order ID
- Real-time status tracker page (progress bar UI: Submitted → Accepted → Processing → Ready → Collected)
- Expected completion date display, with countdown
- Delay notification banner if past ETA
- "Raise Complaint" form (categories: Missing, Damaged, Wrong Count, Wrong Bag, Not Ready, Other) with optional photo upload
- Collection OTP shown on tracking page + sent via SMS
- Order history (auto-fetched by Bag Number + Mobile, no login)
- Feedback/rating after collection (1–5 stars, optional comment)

### 7.2 Washer/Staff Dashboard
- Live queue of incoming requests (sorted by submission time)
- One-tap Accept with count entry (numeric keypad UI for speed)
- Auto-flag on count mismatch (self-reported vs verified)
- Status update buttons (Processing → Ready)
- Bulk status update (select multiple bags, e.g., mark 10 bags "Ready" at once)
- Search by Bag Number / College ID / Mobile
- Daily/weekly load view (how many bags pending, in process, ready)
- Auto-delay flagging: system highlights orders past their expected date in red

### 7.3 Collection Center Dashboard
- Search order by Bag Number/College ID
- OTP verification field before allowing "Collected" action
- Mismatch alert if verified count ≠ returned count
- Manual override with reason (for edge cases, e.g., lost OTP — requires Admin PIN)

### 7.4 Admin Dashboard
- Manage staff accounts (create/disable washer & collection staff logins)
- View all orders, filters by status/date/hostel block
- Complaint management queue with resolution notes
- Analytics:
  - Average turnaround time
  - Peak submission hours (to plan staff shifts)
  - Complaint frequency by category
  - Most delayed periods/washers
- Export data to CSV/Excel
- Configure settings: default expected turnaround days, SMS templates, OTP expiry time

### 7.5 Notifications (SMS/WhatsApp/Email — configurable)
- Order submitted confirmation
- Accepted + expected date
- Delay notice
- Ready for collection + OTP
- Complaint status updates

---

## 8. Tech Stack

### 8.1 Frontend
| Component | Choice | Reason |
|---|---|---|
| Framework | **React.js (Vite)** | Fast, component-based, huge ecosystem, easy dashboard building |
| Styling | **Tailwind CSS** | Rapid, consistent, responsive UI without heavy custom CSS |
| State Management | **React Query (TanStack Query)** | Handles server state, polling for live status updates elegantly |
| Routing | **React Router v6** | Standard client-side routing (`/track/:orderId`, `/staff/dashboard`, etc.) |
| Forms | **React Hook Form + Zod** | Lightweight validation for submission/complaint forms |
| UI Components | **shadcn/ui** | Accessible, clean pre-built components (tables, modals, badges for status) |
| Icons | **lucide-react** | Consistent icon set for status indicators |

> Since it must be usable on any phone browser without installation, the frontend is built **mobile-first and responsive**, working as a lightweight PWA (installable to home screen, optional).

### 8.2 Backend
| Component | Choice | Reason |
|---|---|---|
| Runtime | **Node.js** | JS across stack = faster development, shared types |
| Framework | **Express.js** (or **NestJS** for stricter structure) | Simple REST API, mature ecosystem |
| Language | **TypeScript** | Type safety across Student/Order/Complaint models, fewer runtime bugs |
| Authentication (Staff/Admin only) | **JWT (JSON Web Token)** + bcrypt password hashing | Students need no auth; staff/admin need secure session tokens |
| Validation | **Zod / Joi** | Server-side validation of all incoming requests |
| API Style | **REST** (documented via OpenAPI/Swagger) | Simple, well-understood, easy for future mobile app |

### 8.3 Database
| Component | Choice | Reason |
|---|---|---|
| Primary DB | **PostgreSQL** | Relational integrity needed (Orders ↔ Students ↔ Complaints ↔ Staff), strong consistency for status transitions |
| ORM | **Prisma** | Type-safe queries, easy migrations, works great with TypeScript |
| Caching (optional, for scale) | **Redis** | Cache active order status for fast polling, OTP storage with TTL expiry |

### 8.4 Notifications
| Component | Choice | Reason |
|---|---|---|
| SMS Gateway | **Twilio** or **MSG91** (MSG91/Fast2SMS preferred for India-based colleges — cheaper local rates) | OTP + status SMS delivery |
| WhatsApp (optional upgrade) | **Twilio WhatsApp Business API** or **Gupshup** | Richer notifications, many students prefer WhatsApp over SMS |
| Email (optional, staff-only) | **Nodemailer + SMTP** | Admin reports, staff password resets |

### 8.5 File/Image Storage (for complaint photo evidence)
| Component | Choice | Reason |
|---|---|---|
| Storage | **Cloudinary** or **AWS S3** | Store complaint photos (damaged/wrong laundry proof) securely, with auto-resizing |

### 8.6 Hosting & Infrastructure
| Component | Choice | Reason |
|---|---|---|
| Frontend Hosting | **Vercel** or **Netlify** | Free tier sufficient for a college-scale app, auto CI/CD from Git |
| Backend Hosting | **Render** or **Railway** | Easy Node.js deploy, free/cheap tier, managed Postgres add-on available |
| Database Hosting | **Railway/Render managed Postgres** or **Supabase** | Managed backups, low ops overhead |
| Domain | College subdomain (e.g., `laundry.college.edu`) | Institutional trust, easy to remember |
| Version Control | **Git + GitHub** | Standard source control |
| CI/CD | **GitHub Actions** | Auto test + deploy on push to main |

### 8.7 DevOps / Monitoring
| Component | Choice | Reason |
|---|---|---|
| Error Tracking | **Sentry** | Catch frontend/backend runtime errors in production |
| Uptime Monitoring | **UptimeRobot** (free) | Alert if the service goes down |
| Logging | **Pino** (Node logger) | Structured logs for debugging staff actions |

### 8.8 Suggested Minimal Stack (if resources are limited)
For a lean v1 (single developer, low budget, small college):
- **Frontend:** React + Tailwind, hosted free on Vercel
- **Backend:** Node.js + Express + TypeScript, hosted free on Render
- **Database:** Supabase (free tier Postgres + built-in auth for staff if desired)
- **SMS:** Fast2SMS or MSG91 free/trial credits
- **Storage:** Cloudinary free tier for complaint photos

This entire stack can run at **zero or near-zero monthly cost** for a single-college deployment of a few hundred to a few thousand students.

---

## 9. Database Schema (Entity Design)

### 9.1 `students` (lightweight, auto-created on first submission — not a real "account")
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | VARCHAR | |
| college_id | VARCHAR | optional, indexed |
| bag_number | VARCHAR | indexed, not globally unique (unique per hostel block if needed) |
| mobile_number | VARCHAR | indexed, used for OTP + notifications |
| created_at | TIMESTAMP | |

### 9.2 `orders`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| order_code | VARCHAR | short human-readable code, e.g. `LN-8842` |
| student_id | UUID (FK → students) | |
| bag_number | VARCHAR | duplicated here for fast lookup |
| self_reported_count | INT | entered by student |
| verified_count | INT | entered by washer, nullable until accepted |
| returned_count | INT | entered by collection staff at handover |
| status | ENUM | see status lifecycle table |
| submitted_at | TIMESTAMP | |
| accepted_at | TIMESTAMP | nullable |
| expected_ready_at | DATE | set by washer |
| actual_ready_at | TIMESTAMP | nullable |
| collected_at | TIMESTAMP | nullable |
| collection_otp | VARCHAR | hashed, expires after use/24h |
| assigned_washer_id | UUID (FK → staff) | |
| count_mismatch_flag | BOOLEAN | auto-set if self ≠ verified |
| created_at / updated_at | TIMESTAMP | |

### 9.3 `staff`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | VARCHAR | |
| role | ENUM (`washer`, `collection`, `admin`) | |
| username | VARCHAR (unique) | |
| password_hash | VARCHAR | bcrypt |
| active | BOOLEAN | admin can disable staff |
| created_at | TIMESTAMP | |

### 9.4 `complaints`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| order_id | UUID (FK → orders) | |
| category | ENUM (`missing`, `damaged`, `wrong_count`, `wrong_bag`, `not_ready`, `other`) | |
| description | TEXT | |
| photo_url | VARCHAR | nullable |
| status | ENUM (`open`, `under_review`, `resolved`, `escalated`) | |
| resolution_note | TEXT | nullable |
| raised_at | TIMESTAMP | |
| resolved_at | TIMESTAMP | nullable |
| handled_by | UUID (FK → staff) | nullable |

### 9.5 `status_history` (audit trail — critical for "clothes went missing, when?" investigations)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| order_id | UUID (FK → orders) | |
| from_status | VARCHAR | |
| to_status | VARCHAR | |
| changed_by | UUID (FK → staff, nullable) | null if system-triggered |
| changed_at | TIMESTAMP | |
| note | TEXT | optional (e.g., "verified count differs by 2") |

### 9.6 `notifications_log`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| order_id | UUID (FK → orders) | |
| channel | ENUM (`sms`, `whatsapp`, `email`) | |
| message | TEXT | |
| sent_at | TIMESTAMP | |
| delivery_status | VARCHAR | from gateway callback |

---

## 10. API Design (REST Endpoints)

### Public (no auth)
```
POST   /api/orders                     → Submit new laundry request
GET    /api/orders/track/:orderCode    → Get order status (public tracking page)
POST   /api/orders/:orderCode/complaint→ Raise a complaint
POST   /api/orders/:orderCode/verify-otp → Verify collection OTP (used by staff UI, but can be exposed for student self-check-in kiosks)
```

### Staff (JWT auth required)
```
POST   /api/auth/login                 → Staff/Admin login
GET    /api/staff/orders/queue         → List pending/incoming orders
PATCH  /api/staff/orders/:id/accept    → Accept + enter verified count
PATCH  /api/staff/orders/:id/status    → Update status (processing/ready/delayed)
PATCH  /api/staff/orders/:id/collect   → Mark collected (with OTP + returned count)
GET    /api/staff/orders/search        → Search by bag number/college ID/mobile
```

### Admin (JWT auth, admin role only)
```
GET    /api/admin/orders               → All orders with filters
GET    /api/admin/complaints           → Complaint queue
PATCH  /api/admin/complaints/:id       → Resolve/escalate complaint
GET    /api/admin/analytics/summary    → Turnaround time, peak hours, complaint stats
POST   /api/admin/staff                → Create staff account
PATCH  /api/admin/staff/:id            → Enable/disable staff
GET    /api/admin/export               → CSV export of records
```

---

## 11. Key UX Screens

1. **Landing Page** — "Track your laundry" + "Submit new laundry" (two big buttons)
2. **Submit Request Form** — Name, College ID, Bag Number, Mobile, Cloth Count → Submit
3. **Order Tracking Page** (`/track/:orderCode`) — Progress bar, expected date, OTP box (visible once Ready), "Raise Complaint" button, "Give Feedback" (post-collection)
4. **Complaint Form** — Category dropdown, description, optional photo upload
5. **Washer Dashboard** — Table/card queue of orders, Accept button with count input, status update buttons
6. **Collection Staff Dashboard** — Search bar, OTP verify field, Confirm Collected button
7. **Admin Dashboard** — Tabs: Orders | Complaints | Staff | Analytics

---

## 12. How This Solves Each Original Problem

| Problem | System Solution |
|---|---|
| No laundry tracking | Public order-tracking page with live status, no login needed |
| Uncertain completion time | Washer sets Expected Ready Date; auto-delay flag if missed |
| No clothing count | Dual count system: student self-report + washer verified count, mismatch auto-flagged |
| Clothes misplaced | Full `status_history` audit trail — every status change is timestamped and attributed to a staff member |
| No collection verification | Bag Number + Mobile + one-time Collection OTP required before handover |
| No complaint system | Structured complaint form with categories, photo evidence, admin resolution workflow |
| Poor communication | Automated SMS/WhatsApp at every major status change |
| Peak-hour overcrowding | Students only visit when notified "Ready" — no more guess-and-check visits |
| Manual record keeping | All data in PostgreSQL with staff dashboards replacing paper logs |

---

## 13. Non-Functional Requirements

- **Performance:** Order tracking page should load in <1s; status polling every 15–30s (or WebSocket push for instant updates in v2).
- **Scalability:** Should comfortably handle 2,000–5,000 students, ~500 orders/day peak, on the minimal stack described.
- **Security:**
  - OTPs hashed at rest, expire after 24 hours or first use.
  - Staff passwords hashed with bcrypt (min 10 rounds).
  - Rate-limiting on OTP verification endpoint to prevent brute force.
  - HTTPS enforced everywhere.
- **Availability:** Target 99% uptime during semester (laundry ops usually pause during breaks).
- **Accessibility:** Mobile-first responsive design; works on low-end Android browsers common among students.
- **Data Retention:** Order history retained for at least 1 academic year for dispute resolution.

---

## 14. Future Enhancements (v2+)

- WhatsApp Business API integration for richer, cheaper notifications than SMS.
- Optional QR-code bag tags for even faster staff scanning (still no student app needed).
- Predictive ETA using historical turnaround data per washer/load size.
- Student self-service kiosk (tablet at collection center) for OTP entry without staff involvement.
- Multi-hostel/multi-campus support with block-wise bag number namespacing.
- Laundry load-balancing suggestions for admin (e.g., "shift 20 bags to evening slot").
- Rating-based washer performance dashboard for admin to spot recurring complaint sources.

---

## 15. Suggested Development Roadmap

| Phase | Duration (approx.) | Deliverables |
|---|---|---|
| Phase 1 | Week 1–2 | DB schema, backend API (orders, auth), basic submission + tracking page |
| Phase 2 | Week 3 | Washer & collection dashboards, status lifecycle, OTP flow |
| Phase 3 | Week 4 | Complaints module, SMS notification integration |
| Phase 4 | Week 5 | Admin dashboard, analytics, CSV export |
| Phase 5 | Week 6 | Testing, mobile responsiveness polish, deployment, staff training |

---

## 16. Summary

CLMS replaces a fully manual, opaque laundry process with a **registration-free, SMS-driven, verifiable tracking system**. Students interact through a simple web form and a bookmarkable tracking link — no app, no login, no hardware. Staff get purpose-built dashboards to replace paper logs. A relational database with a full audit trail (`status_history`) ensures every clothing item's journey — from submission to collection — is transparent, timestamped, and attributable, directly resolving the trust, tracking, and crowding problems in the original manual system.
