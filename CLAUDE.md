# College Laundry Management System (CLMS)

## Project Summary
CLMS is a registration-free web application designed to replace a manual, untracked college laundry process with a transparent, trackable, and verifiable digital system. It connects students, laundry staff, and the collection center by utilizing a combination of a pre-assigned Bag Number and a Mobile Number to establish identity, completely eliminating the need for app installs, student account creation, or QR/hardware scanners.

## Tech Stack
- **Frontend:** React.js (Vite), TypeScript, Tailwind CSS, TanStack Query, React Router v7, React Hook Form + Zod, axios, clsx, tailwind-merge, shadcn/ui, lucide-react.
- **Backend:** Node.js, Express.js, TypeScript, Zod for validation.
- **Database:** PostgreSQL.
- **ORM:** Prisma.
- **Authentication:** Google Identity Services (frontend) + `google-auth-library` (backend) for students (@rishihood.edu.in only); JWT (JSON Web Token) + bcrypt for staff/admin.
- **Notifications/SMS:** Twilio, MSG91, or Fast2SMS.
- **Storage:** Cloudinary or AWS S3 (for complaint photo evidence).
- **Hosting (Target):** Vercel/Netlify for frontend, Render/Railway for backend, Supabase/Railway for managed Postgres.

## Folder Structure
```
/
├── frontend/   # React + Vite application (Student & Staff/Admin UI)
├── backend/    # Node.js + Express API server 
├── docs/       # Technical specifications and system architecture docs
├── CLAUDE.md   # Project overview, tech stack, and conventions
├── PROGRESS.md # Roadmap phases and current progress
├── DECISIONS.md# Architecture and technical decision log
└── README.md   # Entry point for the repository
```

## Coding Conventions
- **Naming:** 
  - Use `camelCase` for variables and functions.
  - Use `PascalCase` for internal code structures like React components, interfaces, and types.
  - Use `kebab-case` strictly for ALL file and folder names (e.g., `order-tracker.tsx`, not `OrderTracker.tsx`) in both frontend and backend for safe cross-OS compatibility.
- **File Structure:** Co-locate tests with the source files they test. Group code by feature (e.g., `/features/orders`) rather than strictly by type (`/controllers`, `/routes`), though basic structural separation is fine as long as domain logic stays modular.
- **Commit Messages:** Follow Conventional Commits (e.g., `feat: add order submission endpoint`, `fix: status transition logic`). Use the imperative mood.
- **Typing:** Use strict TypeScript configuration. Avoid `any` - define precise types and rely on Zod bounds at the API boundaries.

## Order Status Lifecycle
| Status | Set By | Meaning | Next Possible States |
|---|---|---|---|
| `SUBMITTED` | Student | Request created, awaiting pickup by washer | `ACCEPTED`, `CANCELLED` |
| `ACCEPTED` | Washer | Bag physically received & counted | `PROCESSING` |
| `PROCESSING` | Washer | Wash/dry/press in progress | `READY`, `DELAYED` |
| `DELAYED` | Washer/System | Past expected date, new ETA set | `PROCESSING`, `READY` |
| `READY` | Washer | Ready for pickup, OTP generated | `COLLECTED` |
| `COLLECTED` | Collection Staff | Verified handover complete | *(terminal)* |
| `COMPLAINT_RAISED` | Student | Issue reported | `UNDER_REVIEW` |
| `UNDER_REVIEW` | Admin | Investigating complaint | `RESOLVED`, `ESCALATED` |
| `RESOLVED` | Admin | Complaint closed | *(terminal)* |
| `CANCELLED` | Student/Admin | Order withdrawn before acceptance | *(terminal)* |

## Inviolable Rules (NEVER VIOLATE)
1. **Student Auth:** Students authenticate via Google Sign-In restricted to @rishihood.edu.in domain only. No separate password is created or stored — identity is Google-verified.
2. **Mandatory Audit Trails:** EVERY change in order status MUST log a record to the `status_history` table for complete tracking.
3. **Hardware Independence:** No QR code, barcode, RFID, or dedicated scanning hardware dependencies in v1. Staff access the dashboard via standard web browsers.
4. **Secure Handover:** A collection OTP (or Bag+Mobile verification loop) is strictly required before any laundry can be marked as `COLLECTED`.
