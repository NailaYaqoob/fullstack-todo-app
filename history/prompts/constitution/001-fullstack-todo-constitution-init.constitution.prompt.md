---
id: 001
title: fullstack-todo-app Constitution Init
stage: constitution
date: 2026-02-25
surface: agent
model: claude-sonnet-4-6
feature: none
branch: master
user: lenovo
command: /sp.constitution
labels: ["constitution","jwt-auth","user-isolation","spec-driven","monorepo","nextjs","fastapi"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
  - frontend/CLAUDE.md
  - backend/CLAUDE.md
  - .spec-kit/config.yaml
tests:
  - none
---

## Prompt

Project: fullstack-todo-app (Phase II Hackathon)
Description: A multi-user full-stack todo web application built with Next.js 16+ (App Router) frontend, Python FastAPI backend, SQLModel ORM, Neon Serverless PostgreSQL database, and Better Auth with JWT for authentication. Monorepo structure with frontend/ and backend/ subdirectories.

Principles to encode:
1. Spec-Driven Development: Every feature starts with a spec → plan → tasks → implement cycle. No manual coding outside this workflow.
2. JWT Auth Enforcement: All API endpoints require valid JWT token. Better Auth issues tokens on frontend; FastAPI verifies using shared BETTER_AUTH_SECRET. No endpoint is publicly accessible.
3. User Isolation: Every database query MUST filter by authenticated user_id. Users can only see and modify their own tasks.
4. API-First Design: Backend exposes RESTful JSON API. Frontend communicates only via /lib/api.ts client. No direct DB access from frontend.
5. Environment Variables Only: No hardcoded secrets, connection strings, or tokens. Use .env files. BETTER_AUTH_SECRET and DATABASE_URL are required env vars.
6. Smallest Viable Change: Prefer targeted diffs over large rewrites. Each task is atomic and independently testable.
7. Type Safety: TypeScript strict mode on frontend; Pydantic/SQLModel models on backend. No `any` types without justification.

Tech Stack:
- Frontend: Next.js 16+ App Router, TypeScript, Tailwind CSS, Better Auth client
- Backend: Python FastAPI, SQLModel, Neon PostgreSQL
- Auth: Better Auth (frontend) + JWT verification middleware (backend)
- Shared secret: BETTER_AUTH_SECRET env var (both services)

Development Commands:
- Frontend: cd frontend && npm run dev (port 3000)
- Backend: cd backend && uvicorn main:app --reload (port 8000)
- Both: docker-compose up

## Response snapshot

Ratified constitution v1.0.0 at `.specify/memory/constitution.md` with 7 principles:
I. Spec-Driven Development, II. JWT Auth Enforcement, III. User Isolation,
IV. API-First Design, V. Environment Variables Only, VI. Smallest Viable Change,
VII. Type Safety. Created `frontend/CLAUDE.md` and `backend/CLAUDE.md` with
stack-specific guidelines and `.spec-kit/config.yaml` for Spec-Kit configuration.
Templates reviewed — no structural changes required.

## Outcome

- ✅ Impact: Project constitution ratified; all 7 principles encoded; frontend and backend CLAUDE.md files created; monorepo structure established
- 🧪 Tests: none (constitution stage — no code tests)
- 📁 Files: .specify/memory/constitution.md, frontend/CLAUDE.md, backend/CLAUDE.md, .spec-kit/config.yaml
- 🔁 Next prompts: /sp.specify task-crud, /sp.specify authentication
- 🧠 Reflection: Clean initial ratification; JWT + user isolation principles are the most critical security constraints and are explicitly non-negotiable

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): proceed to /sp.specify for task-crud feature
