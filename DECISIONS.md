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

