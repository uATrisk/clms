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
