---
id: 005
title: Reusable Skill Definitions Created
stage: general
date: 2026-02-25
surface: agent
model: claude-sonnet-4-6
feature: none
branch: 001-task-crud
user: lenovo
command: generate reusable skill definition SKILL.md files
labels: ["skills","nextjs","fastapi","better-auth","sqlmodel","neon","monorepo","reusable-intelligence"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - skills/nextjs-app-router.md
  - skills/fastapi-rest.md
  - skills/better-auth-jwt.md
  - skills/sqlmodel-neon.md
  - skills/fullstack-monorepo.md
  - skills/README.md
tests:
  - none
---

## Prompt

For the Phase II Todo Full-Stack project, create skill definition files that can be added to /mnt/skills/ for Claude Code to reference. Generate SKILL.md files for: nextjs-app-router, fastapi-rest, better-auth-jwt, sqlmodel-neon, fullstack-monorepo. Each SKILL.md should include: Overview, Key patterns and best practices, Common pitfalls to avoid, Code snippets/templates, Integration points with other skills.

## Response snapshot

Created 5 comprehensive skill definition files in skills/ (project root) plus a README index.
Each skill file contains: overview, complete code templates, common pitfalls table, and
integration points. Skills are cross-referenced with each other and with project constitution principles.

Skills created:
1. nextjs-app-router.md — App Router, RSC vs client, api.ts pattern, Tailwind, TypeScript types, middleware
2. fastapi-rest.md — Route handlers, Depends(), two-check ownership pattern, HTTP status codes, async queries
3. better-auth-jwt.md — JWT plugin setup, login/signup pages, route protection, backend verify_jwt(), env vars
4. sqlmodel-neon.md — DB connection, three-layer model pattern, Neon SSL/pooling, CRUD queries, schema init
5. fullstack-monorepo.md — Repo layout, env var sync, API contract mirroring, CORS, Docker Compose, agent matrix

## Outcome

- ✅ Impact: 5 reusable skill reference documents; agents can read these before implementing; patterns consistent with constitution principles
- 🧪 Tests: none (documentation — no runtime tests)
- 📁 Files: 6 files in skills/ directory
- 🔁 Next prompts: /sp.specify authentication, /bootstrap (scaffold project), /sp.plan (task-crud)
- 🧠 Reflection: Skills are organized by layer (frontend/backend/auth/db/structure) matching the agent responsibility matrix. Each pitfall table maps directly to constitution principle violations to watch for.

## Evaluation notes (flywheel)

- Failure modes observed: /mnt/skills/ not writable on Windows — created in project root skills/ instead
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): reference skill files in agent system prompts' mandatory pre-steps
