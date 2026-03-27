# Skills — Reusable Intelligence

This directory contains reusable skill definition files for the fullstack-todo-app project.
Each file is a reference document that agents read before implementing work in that domain.

## Available Skills

| Skill | File | Covers |
|-------|------|--------|
| **nextjs-app-router** | `nextjs-app-router.md` | App Router patterns, RSC vs Client, routing, API client, Tailwind, TypeScript types |
| **fastapi-rest** | `fastapi-rest.md` | Route handlers, Depends(), auth pattern, HTTP status codes, async SQLModel queries |
| **better-auth-jwt** | `better-auth-jwt.md` | Better Auth setup, JWT plugin, login/signup pages, route protection, backend verification |
| **sqlmodel-neon** | `sqlmodel-neon.md` | DB connection, model definitions, CRUD patterns, Neon SSL/pooling, schema init |
| **fullstack-monorepo** | `fullstack-monorepo.md` | Repo structure, env vars, API contract sync, CORS, Docker Compose, agent matrix |

## How Agents Use These Skills

Agents are instructed to read relevant skill files before implementing work:

```
# In agent system prompts:
"Before implementing, read skills/nextjs-app-router.md for component patterns"
"Refer to skills/fastapi-rest.md for the route handler pattern and HTTP status codes"
```

## Skill Integration Map

```
nextjs-app-router ──────► better-auth-jwt  ◄──── fastapi-rest
       │                        │                      │
       └──────────────────► fullstack-monorepo ◄───────┘
                                  │
                             sqlmodel-neon
```

## Updating Skills

Update skill files when:
- A new pattern is established and used consistently
- A common pitfall is discovered and fixed
- A library version change affects the patterns
- A new integration point is identified

Skills are living documents — keep them current with actual project patterns.
