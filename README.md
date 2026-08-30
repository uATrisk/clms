# College Laundry Management System (CLMS)

CLMS is a registration-free, trackable, and verifiable web application designed to manage college laundry workflows between students, washers, and collection center staff.

## Source of Truth & Memory Documents

The development workflow, architectural guidelines, status tracking, and decision logs are strictly maintained in the following root files:

- **[CLAUDE.md](./CLAUDE.md)** — Project overview, complete tech stack, folder structure, coding conventions, state machine lifecycle, and inviolable design rules.
- **[PROGRESS.md](./PROGRESS.md)** — Roadmap checklist, phases, sub-tasks, and session summaries.
- **[DECISIONS.md](./DECISIONS.md)** — Append-only Architectural Decision Records (ADRs).
- **[docs/](./docs/)** — Detailed technical specifications and system designs (see [Laundry_Management_System_Spec.md](./docs/Laundry_Management_System_Spec.md)).

## Monorepo Layout

```
/
├── frontend/   # React + Vite + TypeScript + Tailwind CSS application
├── backend/    # Node.js + Express + TypeScript + Prisma API
├── docs/       # Technical specs & architecture documentation
├── CLAUDE.md
├── PROGRESS.md
├── DECISIONS.md
└── README.md
```
