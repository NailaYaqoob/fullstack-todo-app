---
id: 004
title: Create Project Agent Skills
stage: general
date: 2026-02-25
surface: agent
model: claude-sonnet-4-6
feature: none
branch: 001-task-crud
user: lenovo
command: create skills required by this project
labels: ["agents","skills","neon-db","project-bootstrap","orchestrator","sdd","reusable-intelligence"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/agents/neon-db.md
  - .claude/agents/project-bootstrap.md
  - .claude/agents/orchestrator.md
  - .claude/agents/backend-fastapi.md
  - .claude/agents/frontend-nextjs.md
  - .claude/agent-memory/neon-db/MEMORY.md
  - .claude/agent-memory/project-bootstrap/MEMORY.md
tests:
  - none
---

## Prompt

before going forward first create skills which are required by this project, read claude code docs for proper structure of agent skills which can use as a reuseable intelligence

## Response snapshot

Read all 4 existing agents (orchestrator, backend-fastapi, frontend-nextjs, auth-jwt-flow) and
Claude Code docs for agent/command structure. Identified 2 critical gaps and 3 agents with
incorrect spec paths. Created 2 new agents and updated 3 existing agents:

NEW:
- neon-db.md: Neon PostgreSQL + SQLModel specialist (db.py, models.py, schema init, Neon SSL config)
- project-bootstrap.md: One-time project scaffolding (Next.js 16, FastAPI, Docker Compose, .env.example)

UPDATED (spec path fixes + constitution references):
- orchestrator.md: specs/features/ → specs/<NNN>-<feature>/; added 2 new agents to routing table
- backend-fastapi.md: specs/api/rest-endpoints.md + specs/database/schema.md → SDD paths
- frontend-nextjs.md: specs/ui/components.md + specs/ui/pages.md → SDD paths; constitution checklist

## Outcome

- ✅ Impact: 6 specialist agents now aligned with SDD spec structure; 2 new agents cover critical gaps
- 🧪 Tests: none (agent creation — no runtime tests)
- 📁 Files: 5 agent files updated/created; 2 memory directories initialized
- 🔁 Next prompts: /sp.specify authentication, then bootstrap project with project-bootstrap agent
- 🧠 Reflection: The spec path mismatch (specs/api/rest-endpoints.md vs specs/001-task-crud/spec.md) would have caused all existing agents to look for files that don't exist. Critical fix before any implementation work.

## Evaluation notes (flywheel)

- Failure modes observed: existing agents referenced wrong spec paths; no dedicated DB or bootstrap agent
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): /sp.specify authentication to complete the spec layer
