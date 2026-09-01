# Architecture and Technical Decisions Log

This document serves as an append-only record of all major architectural, design, and technical decisions made for the College Laundry Management System (CLMS). Each entry includes the date, decision title, context, choices considered, and the rationale for the final selection.

---

## [2026-08-30] ADR 001: Selection of Core Tech Stack (React, Node.js/Express, PostgreSQL, Prisma)

### Context
We are building the College Laundry Management System (CLMS) as a lightweight, registration-free web application for university students and staff. The system requires rapid mobile-first interfaces for students, responsive dashboards for staff/admin, a robust relational data model for order tracking and audit trails, and zero barrier to entry (no app installs, no QR hardware).

### Decision
We have chosen the following stack:
1. **Frontend:** React.js with Vite, TypeScript, Tailwind CSS, TanStack Query, React Router v6, React Hook Form + Zod, and shadcn/ui.
2. **Backend:** Node.js with Express.js and TypeScript.
3. **Database & ORM:** PostgreSQL with Prisma ORM.
4. **Authentication:** JWT (JSON Web Tokens) with bcrypt password hashing (staff/admin only; students have no login).
5. **Storage & Notifications:** Cloudinary/S3 for complaint photo uploads; Twilio / MSG91 / Fast2SMS for SMS-based tracking and OTP delivery.
6. **Hosting / Infrastructure:** Vercel (Frontend), Render / Railway (Backend API), and Supabase / Railway (Managed Postgres).

### Rationale
- **Registration-Free Student Experience:** React with Vite enables high-performance, mobile-first responsive SPAs and PWAs without forcing native app installations.
- **Relational Integrity & Audit Logging:** Order lifecycles, dual-count verifications, status histories, and complaints require strict relational constraints, foreign keys, and atomic state transitions provided by PostgreSQL.
- **Type Safety End-to-End:** Using TypeScript across both the frontend and backend with Prisma and Zod ensures end-to-end type safety, preventing data contract drift between API and client.
- **Low Operational & Hosting Cost:** The selected stack can be hosted entirely on free/low-cost tiers (Vercel, Render, Supabase), making it accessible for single-college budgets while easily scaling to thousands of students.
- **Maintainability & Extensibility:** Express.js and Prisma provide a clean, standard REST architecture that is straightforward to test, document with OpenAPI/Swagger, and extend for future features (e.g., WhatsApp integration or multi-hostel support).

### Status
Accepted

**Amendment (2026-08-30):** Updated React Router from v6 to v7 (installed as `react-router-dom@7.18.3`). The application exclusively consumes stable, declarative routing primitives (`BrowserRouter`, `Routes`, `Route`, `useNavigate`, `useParams`, `Link`, `Navigate`) ensuring full backward compatibility with no breaking changes.

---

## [2026-08-30] ADR 002: Prisma Schema Design, PostgreSQL Enums & Status Audit Trail Model

### Context
During the Phase 1 backend foundation implementation, we defined the relational schema for `students`, `orders`, `staff`, `complaints`, `status_history`, and `notifications_log`. We needed to make concrete choices regarding database-level enums, indexing strategies for registration-free lookups, and the audit trail relation schema.

### Decisions
1. **PostgreSQL Enums for Finite State Sets:**
   - Enums were defined for `OrderStatus`, `StaffRole`, `ComplaintCategory`, `ComplaintStatus`, and `NotificationChannel` directly in the database.
   - For `status_history`, `fromStatus` is made nullable (to cleanly represent initial order creation transitions from null to `SUBMITTED`), while `toStatus` strictly utilizes the `OrderStatus` enum.

2. **Index Strategy for Registration-Free Identity:**
   - Indexed `bag_number`, `mobile_number`, and `college_id` in the `students` table to facilitate rapid sub-second lookups by staff and magic-link tracking lookups.
   - Denormalized `bag_number` onto `orders` and indexed it directly so staff queue and search queries do not require unnecessary joins for high-throughput dashboard views.

3. **Status Audit Trail Attribution:**
   - In `status_history`, `changed_by` is an optional foreign key referencing `staff(id)`. When status transitions are triggered by system events (such as auto-flagging delay past ETA) or student actions, `changed_by` is set to `null`, while staff-initiated transitions capture the actor's UUID.

4. **Count Mismatch Tracking:**
### Status
Accepted

---

## [2026-08-30] ADR 003: Migration from Local PostgreSQL to Supabase

### Context
During initial backend setup, a local PostgreSQL database (`clms_db`) was used. However, per our infrastructure decisions outlined in `CLAUDE.md`, Supabase is the targeted managed database provider. We need to mirror production-like connection environments as closely as possible in development.

### Decision
We migrated the development database target from the local PostgreSQL instance to the provisioned Supabase instance:
1. Re-configured `DATABASE_URL` (Port 6543) with PgBouncer connection pooling (`pgbouncer=true`) for application runtime queries.
2. Introduced `DIRECT_URL` (Port 5432) for direct session-mode schema migrations via Prisma.
3. Reset migration history and executed the initial migration (`init`) and database seed directly on Supabase.

### Rationale
Ensuring that local development interacts with the intended target network architecture (like the Supabase PgBouncer pooler vs. the direct session mode) catches connection limits and Prisma pooling issues early, staying fully aligned with the designated hosting stack.

### Status
Accepted


---

## [2026-08-30] ADR 004: Adopting Axios for Frontend HTTP Client

### Context
While laying the foundational API submission layer in the React frontend, we needed an HTTP client to communicate with the Node.js backend (`POST /api/orders`). The original tech stack in `CLAUDE.md` specified TanStack Query for data fetching/polling, but did not explicitly specify the underlying HTTP promise-based client.

### Decision
We adopted `axios` as the explicit HTTP client library for the frontend and successfully integrated it into our `SubmitPage` React-Hook-Form module.

### Rationale
- **Automatic JSON Parsing**: Axios automatically formats and parses JSON, reducing the boilerplate `response.json()` calls inherent to `fetch`.
- **Response Format Consistency**: Axios wraps the response shape neatly (making fields like `error.response?.data?.error?.message` accessible), allowing simplified, unified error handling structures on the client side.
- **Interoperability**: It integrates smoothly alongside TanStack Query for data fetching abstractions out-of-the-box.

### Status
Accepted

---

## [2026-08-30] ADR 005: Adopting clsx for Conditional Tailwind Class Composition

### Context
While developing the real-time order tracking details page (`/track/:orderCode`), we needed a clean and safe utility for toggling dynamic class names across the multi-step lifecycle progress tracker and state chips depending on the current order status.

### Decision
We adopted `clsx` as the standard class utility for conditional Tailwind class composition in the frontend.

### Rationale
- **Simplicity and Performance**: `clsx` is a tiny, zero-dependency utility that replaces fragile string concatenations and template literals with clean boolean/object-based syntax.
- **Ecosystem Compatibility**: It works natively alongside Tailwind CSS and standard React components, and is commonly paired with `tailwind-merge` in modern React design systems (e.g., shadcn/ui `cn()` helper).

### Status
Accepted

---

## [2026-08-30] ADR 006: Inclusion of tailwind-merge in Frontend Dependencies

### Context
`tailwind-merge` was installed as a foundational utility during initial project scaffolding alongside `clsx` and `@tailwindcss/vite`, in anticipation of shadcn/ui component integration. We needed to formalize its inclusion in the project's documented tech stack.

### Decision
Include `tailwind-merge` as an approved dependency in the frontend stack.

### Rationale
- **Class Conflict Resolution**: Unlike `clsx` (which handles conditional class joining), `tailwind-merge` intelligently resolves conflicting Tailwind CSS utility classes (e.g., `px-2` vs `px-4`, `bg-red-500` vs `bg-blue-500`) without cascade ambiguities.
- **shadcn/ui Standard**: It is the standard utility powering the canonical `cn()` helper function across shadcn/ui components and accessible UI primitives.

### Status
Accepted

---

## [2026-08-30] ADR 007: Adoption of Google Sign-In for Student Authentication

### Context
Originally, the system was designed with a registration-free student identity model relying on a combination of a Physical Bag Number and Mobile Number, with magic links and SMS OTPs planned for verification. While this eliminated onboarding friction, it opened the system to potential spoofing, anonymous submissions, and unauthorized tracking inquiries. Because the laundry facility strictly serves members of Rishihood University, student identity can and should be grounded in their institutional Google accounts.

### Decision
We are adopting Google Sign-In as the mandatory authentication mechanism for students:
1. **Domain Restriction:** Only Google accounts ending in `@rishihood.edu.in` (e.g., `hd` claim in Google ID token) are authorized. All other domains are rejected with `403 Forbidden`.
2. **Library & Flow:** We utilize Google Identity Services on the frontend and `google-auth-library` on the backend (`POST /api/auth/google`) to verify the Google ID token server-side and issue an application-level session JWT.
3. **Preservation of Physical Attributes:** The physical Bag Number and student Mobile Number remain mandatory operational fields captured during the submission and collection lifecycle; they are just no longer used as the cryptographic authentication surrogate.
4. **Staff/Admin Isolation:** Staff and admin authentication continues independently via username/password and bcrypt-hashed credentials (`POST /api/auth/login`).

### Rationale
- **Zero Friction with Verified Identity:** Students already possess active `@rishihood.edu.in` Google workspace accounts; using Google One Tap / Sign-In requires zero password management or onboarding steps while providing cryptographically verified identity.
- **Lightweight Implementation:** `google-auth-library` provides robust server-side token validation without requiring bloated third-party vendor SDKs or vendor lock-in like Firebase.
- **Security & Authorization:** Guarantees that only valid university students can submit laundry requests or review their order histories.

### Status
Accepted

**Amendment (2026-08-31):** Corrected the domain validation check to support official university subdomains (such as `nst.rishihood.edu.in` or `ds.rishihood.edu.in`). The backend domain restriction now validates that the email domain is exactly `rishihood.edu.in` OR securely ends with `.rishihood.edu.in` (`domain === 'rishihood.edu.in' || domain.endsWith('.rishihood.edu.in')`), preventing unauthorized access from non-university domains while admitting all departmental and school subdomains.

---

## [2026-08-31] ADR 008: Adoption of @react-oauth/google for Frontend Google Identity Services

### Context
Following ADR 007's decision to adopt Google Sign-In for student authentication restricted to `@rishihood.edu.in`, we needed a React wrapper for Google Identity Services (GIS) on the frontend. The library needs to handle client-side script loading, the "Sign in with Google" button rendering, One Tap prompts, and safe retrieval of the Google ID token (`credential`) to exchange with our backend API (`POST /api/auth/google`).

### Decision
We adopted `@react-oauth/google` as the official client library for Google OAuth in the React frontend.

### Rationale
- **Official Google Identity Services (GIS) Alignment**: It wraps modern Google Identity Services rather than deprecated legacy Google Sign-In (`gapi.auth2`).
- **Declarative React Components & Hooks**: Provides the `GoogleOAuthProvider` context and `<GoogleLogin />` component out-of-the-box, supporting custom button themes, shapes, sizes, and One Tap integrations without manual DOM script injection.
- **Lightweight Footprint**: Has zero heavyweight external dependencies and integrates smoothly with our custom `AuthProvider` and React Router route guards.

### Status
Accepted

---

## [2026-08-31] ADR 009: Interim Plaintext Storage of Collection OTP

### Context
While the laundry tracking layout allows students to view their Collection OTP when an order is marked `READY`, the system generates a secure bcrypt hash of the OTP for later verification prior to collection (as intended for a secure SMS-delivery model). However, the real SMS delivery mechanism is scheduled for Phase 3. 

### Decision
We chose to store the OTP in plaintext alongside its hash (`collectionOtpPlain`) as an interim solution so students can view it directly on the tracking page until real SMS delivery is built. When an order transitions to `READY`, the plaintext OTP is exposed via the tracking API. It must be cleared/nulled immediately once the status progresses to `COLLECTED` in the future `/collect` endpoint.

### Rationale & Important Caveat
This is a temporary measure designed to unblock end-to-end testing and the frontend tracking lifecycle without paying the cost of real SMS vendor setup right now. 
**Security Tradeoff:** The plaintext OTP is readable by anyone with direct database access. This compromises the cryptographic intention behind the `collectionOtp` hash. This choice is intentionally isolated to an explicitly named `collectionOtpPlain` field to ensure it is not silently forgotten as a permanent design choice. Once SMS dispatch is added in Phase 3, this field should ideally be phased out entirely.

### Status
Accepted (Interim)

---

## [2026-08-31] ADR 010: Tolerant Batch Architecture for Bulk Order Status Updates

### Context
When implementing the bulk status transition feature (`PATCH /api/staff/orders/bulk/status`) in the Washer Dashboard to allow staff to mark multiple `PROCESSING` orders as `READY` simultaneously, we had to choose between a "strict batch" (fail the entire transaction if any single order fails validation) or a "tolerant batch" (skip invalid/ineligible items and process the rest).

### Decision
We adopted a Tolerant Batch Processing architecture.
1. The endpoint accepts an array of `orderIds`.
2. It evaluates all IDs upfront against database state.
3. Orders not found or in invalid statuses (e.g., `ACCEPTED` instead of `PROCESSING`) are appended to a `failed` array with explicit reasons.
4. All valid `PROCESSING` orders are successfully transitioned to `READY`, get OTPs generated, and receive `status_history` audit logs strictly atomically inside a single `prisma.$transaction`.
5. The API responds with HTTP 200 containing a summary of `{ succeeded: [...], failed: [...] }`.

### Rationale
- **Concurrency Resilience:** In a high-volume live environment, two staff members might process the same queue concurrently. If Staff A transitions Bag 101, and Staff B selects Bag 101 through Bag 120, a strict batch would fail Staff B's entire action. The tolerant batch prevents a single desynced line item from blocking 19 valid ones from receiving their OTPs.
- **Operational Continuity:** Washers receive a clean UI summary modal explicitly explaining which bag failed ("Invalid status", etc.), saving them from manually deselecting mismatched checkboxes to retry.

### Status
Accepted

---

## [2026-08-31] ADR 011: Manual Admin PIN Override for Order Collection

### Context
To finalize the strict OTP-verified collection loop (Phase 2), we identified critical physical operational edge cases: a student's phone dies, they lose their OTP, or SMS delivery strictly fails. The collection desk needs a secure, auditable circumvention mechanism to physically hand back garments to students without blocking the workflow.

### Decision
We implemented a shared-secret Manual Admin Override mechanism for the `PATCH /api/staff/orders/:id/collect` endpoint.
1. We introduced an `ADMIN_PIN` environment variable as a simple, stateless shared secret.
2. The collection payload conditionally accepts an `adminPin` field instead of an `otp`.
3. If a valid `adminPin` is provided, OTP stringency is entirely bypassed.
4. **Mandatory Audit Logging:** Whenever the override is utilized, the `status_history` table's `note` field explicitly records `"Collected via ADMIN PIN OVERRIDE - OTP was bypassed"`.

### Rationale
- **Simplicity vs Bureaucracy:** We intentionally avoided building a complex granular permission escalation or multi-device approval flow. A simple environment variable shared secret (`ADMIN_PIN`) is adequate for the physical reality of a campus laundry room desk override.
- **Auditability Inviolability:** By enforcing the override note in the atomic `$transaction`, administrators can always query the database to review exactly which staff member accounts bypassed standard security, preserving trust without restricting factory floor velocity.

### Status
Accepted

---

## [2026-08-31] ADR 012: Shift from Per-Order to Per-Profile Student Identity Fields

### Context
In the original Phase 1 design, students re-entered their `mobileNumber`, `bagNumber`, and optional `collegeId` on every single order submission. In reality, laundry bags are physically issued to students once for the semester or academic year, and mobile numbers/college IDs are static attributes of student identity. Re-entering these fields on every order caused unnecessary friction, redundant validation, and risked student input typos causing desynchronization with physically tagged laundry bags.

### Decision
We moved `bagNumber`, `mobileNumber`, and `collegeId` to the `Student` profile record:
1. **Dedicated Student Profile Endpoints:** Added `GET /api/students/me` and `PATCH /api/students/me` (both protected with `authenticate` and `authorize(['STUDENT'])`) for onboarding profile setup and subsequent profile updates.
2. **Simplified Order Submission:** `POST /api/orders` now accepts only `selfReportedCount` in the request body. Identity attributes (`bagNumber`, `mobileNumber`, `collegeId`) are resolved directly from the authenticated student's saved profile record (`req.user.id`).
3. **Profile Completeness Safety Net:** If a student attempts to submit an order before saving their `bagNumber` or `mobileNumber`, `POST /api/orders` immediately rejects the request with `400 Bad Request` ("Please complete your profile before submitting laundry").
4. **Schema Adjustment:** Made `bagNumber` and `mobileNumber` nullable (`String?`) on the `Student` Prisma model to support the initial Google OAuth sign-in flow before first-time profile completion.

### Rationale
- **Frictionless Submission:** Students only specify the item count for their drop-off, dramatically speeding up submission times.
- **Data Integrity:** Matches the physical operational model where a physical bag number is uniquely tied to a student throughout their campus stay.
- **Single Source of Truth:** Changes to phone numbers or bag reassignment happen in one central profile location without affecting order histories.

### Status
Accepted

---

## [2026-08-31] ADR 013: Frontend Profile Completeness Barrier & UX Overhaul

### Context
Following ADR 012, the backend order submission endpoint now demands robust pre-existing student profiles and stripped out per-order collection of `bagNumber` and `mobileNumber`. The frontend UI must adapt to gracefully navigate new students through this profile completion requirement before they are permitted to execute any core lifecycle tasks (submitting or tracking).

### Decision
1. **Introduction of the `/profile` Guard:** We implemented a global profile completeness guard within the `ProtectedRoute` component. When a student signs in, or attempts to access `/submit` or `/track` without a saved `bagNumber` or `mobileNumber` in the `auth-context`, they are transparently routed to a new `/profile` page.
2. **Simplified Drop-Off (`/submit`):** Form schema fields for identity (`bagNumber`, `collegeId`, `mobileNumber`) were entirely ripped out of `submit-page.tsx`. The interface now boasts a streamlined "Number of items" input, with a read-only contextual summary card dynamically loading the student's email and bound Bag Number.
3. **Editable Identity Strategy:** We integrated a profile "Settings" link directly into the primary application `Header`, enabling authenticated students to retroactively fix or update their `bagNumber` (e.g., if a bag splits or gets permanently re-issued) natively inside the existing web application without needing a staff override.
4. **State Navigation Interception:** We enriched React Router's strictly declarative `<Navigate />` usage, passing deep links (`location.pathname`) alongside the authorization redirects to perfectly preserve flow intent post-setup. (e.g., trying to submit → gets sent to complete profile → completes form → automatically forwards straight to submit page).

### Rationale
- **Zero-Friction Re-Engagement:** Return-student drop-off speed is now near instantaneous (entering a single count integer).
- **Graceful Onboarding:** We transformed a hard backend barrier (400 Bad Request if missing fields) into an invisible, self-correcting routing loop that immediately satisfies the backend condition with zero opaque error screens.
### Status
Accepted

**Addendum (2026-09-01)**: Fixed a bug where `POST /api/auth/google` omitted `mobileNumber` and `collegeId` in its response, causing the frontend context to overwrite a cached completed profile with a partial one upon sign-in. Both `auth-controller.ts` and the frontend `auth-context.tsx` (User type) were updated to handle the complete profile shape (including `collegeId`), fixing potential redirection loops on `/profile`.

---

## [2026-09-01] ADR 014: Single Active Order Enforcement per Student

### Context
In the physical operational model of the campus laundry facility, each student is issued a single physical laundry bag bearing a unique bag number. A student cannot physically submit a second bag of laundry while their current bag is in circulation (i.e. being washed, dried, pressed, awaiting pickup, or undergoing complaint review). Allowing multiple concurrent active orders for the same student creates data desynchronization, confusing OTP states, and race conditions at the collection counter.

### Decision
We enforce a strict single-active-order rule on the backend:
1. **Active Order Definition:** Any order where `status NOT IN ('COLLECTED', 'CANCELLED')` is classified as active (including `SUBMITTED`, `ACCEPTED`, `PROCESSING`, `DELAYED`, `READY`, `COMPLAINT_RAISED`, `UNDER_REVIEW`, `RESOLVED`).
2. **Current Order Endpoint (`GET /api/orders/my-active`):** A dedicated endpoint protected with `authenticate` and `authorize(['STUDENT'])` that retrieves the authenticated student's active order, complete with full lifecycle timeline, complaints, and OTP (if `READY`), mirroring the `trackOrder` response structure. If no active order exists, it returns `{ order: null }`.
3. **Submission Conflict Guard (`POST /api/orders`):** Before creating a new order, the backend checks for an existing active order for `req.user.id`. If found, the request is rejected with `409 Conflict` and an explicit error payload specifying the existing `orderCode` and `status`.

### Rationale
- **Physical Reality Mirroring:** Enforcing one active order directly reflects campus operations where one student possesses one physical bag.
- **Atomic State Clarity:** Guarantees that student dashboards, tracking views, and OTP lookups remain unambiguous without complex multi-order tab navigation.

### Status
Accepted

---

## [2026-09-01] ADR 015: Frontend "My Current Order" Routing & 409 Conflict UX

### Context
With single active order enforcement on the backend (ADR 014), the student tracking UX needed to eliminate the manual step of entering an `orderCode` when checking on active laundry, while preserving the ability to search for historical or specific orders by code. Furthermore, if a student navigates to `/submit` while an active order is in flight, the form should gracefully guide them to their active order rather than displaying an opaque error banner.

### Decision
1. **Intelligent `/track` Routing:** `/track` now automatically triggers `GET /api/orders/my-active`:
   - If an active order exists (200), the student is automatically forwarded to `/track/:orderCode` displaying the full timeline and OTP status.
   - If no active order exists (404), `/track` renders a clean empty state indicating no laundry is in progress, with a prominent call-to-action button to submit a new laundry bag.
2. **Preserved Code-Based Tracking (`/track/search`):** The legacy manual order code input view was moved to `/track/search`. Secondary links on `/track` and `/track/:orderCode` allow students to easily search historical or specific orders by code without triggering active-order redirects.
3. **Graceful 409 Conflict Handling on `/submit`:** When `POST /api/orders` returns `409 Conflict` containing the in-flight `orderCode` and `status`, `SubmitPage` captures the error details and presents an amber contextual alert banner with a direct "View Order #XXXX" link navigating straight to `/track/:orderCode`.

### Rationale
- **Zero-Friction Access:** Students no longer need to retain, copy, or recall SMS tracking codes to monitor active laundry.
- **Predictable Error Recovery:** Replaces generic submission rejections with actionable routing directly to the order blocking submission.

### Status
Accepted


