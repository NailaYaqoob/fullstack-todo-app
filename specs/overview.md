# Todo App Overview

## Purpose
A todo application that evolves from a console app to a fully-featured, cloud-native AI chatbot deployed on Kubernetes. Built using Spec-Driven Development with Claude Code and Spec-Kit Plus.

## Current Phase
Phase III: AI-Powered Todo Chatbot

## Tech Stack
- **Frontend**: Next.js 16+, TypeScript (strict), Tailwind CSS, Better Auth 1.x + JWT plugin
- **Backend**: Python FastAPI 0.111+, SQLModel 0.0.18+, asyncpg
- **Database**: Neon Serverless PostgreSQL
- **Auth**: Better Auth with JWT (shared `BETTER_AUTH_SECRET`)
- **AI (Phase III)**: OpenAI Agents SDK, OpenAI ChatKit, Official MCP SDK (Python)
- **Tooling**: Claude Code, Spec-Kit Plus, Docker Compose

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| Phase I | In-Memory Python Console App | Complete |
| Phase II | Full-Stack Web Application | Complete |
| Phase III | AI-Powered Todo Chatbot | Pending |
| Phase IV | Local Kubernetes Deployment | Pending |
| Phase V | Advanced Cloud Deployment | Pending |

## Features
- [x] Task CRUD operations (001-task-crud)
- [x] User authentication with Better Auth (002-user-auth)
- [ ] Task filtering and sorting
- [ ] AI chatbot interface (Phase III)

## Monorepo Structure
```
fullstack-todo-app/
├── specs/            # Specifications organized by type
│   ├── overview.md
│   ├── features/     # Feature specs (what to build)
│   ├── api/          # API endpoint and MCP tool specs
│   ├── database/     # Schema and model specs
│   └── ui/           # Component and page specs
├── frontend/         # Next.js 16 app
├── backend/          # FastAPI app
└── docker-compose.yml
```

## Development Workflow
1. Read relevant spec: `@specs/features/<feature>.md`
2. Implement backend: `@backend/CLAUDE.md`
3. Implement frontend: `@frontend/CLAUDE.md`
4. Test and iterate

## Commands
- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend && python run.py`
- Both: `docker-compose up`
