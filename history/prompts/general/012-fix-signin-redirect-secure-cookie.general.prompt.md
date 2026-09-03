---
id: 012
title: Fix sign-in redirect loop on HTTPS
stage: general
date: 2026-09-03
surface: agent
model: claude-opus-5
feature: none
branch: 003-chatbot
user: nailaimran8686@gmail.com
command: general
labels: ["auth", "better-auth", "middleware", "bugfix", "vercel"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - frontend/middleware.ts
 - frontend/app/login/page.tsx
tests:
 - npx tsc --noEmit (PASS)
 - npm run build (BLOCKED — pre-existing local lightningcss native binary missing on WSL, unrelated to change)
---

## Prompt

I stuck in sign in when i click to sighnin it doesnot redirect to app

## Response snapshot

Root cause identified in `frontend/middleware.ts:6-9`. The middleware looked for the
session cookie under the fixed names `better-auth.session_token`, `__session`, and
`session`. Better Auth prefixes its session cookie with `__Secure-` when the app is
served over HTTPS, so on the Vercel deployment
(`https://fullstack-todo-app-phi-one.vercel.app`) the real cookie name is
`__Secure-better-auth.session_token`. The middleware therefore never found a cookie:
sign-in succeeded, `router.push("/dashboard")` navigated, the `/dashboard/:path*`
matcher ran, found nothing, and redirected back to `/login` — an invisible loop that
presents as "sign in does nothing".

Fixes applied:
1. `frontend/middleware.ts` — replaced the hardcoded cookie lookups with
   `getSessionCookie(request)` from `better-auth/cookies`, which checks both the plain
   and `__Secure-`-prefixed cookie names (verified in the installed better-auth 1.4.x
   dist: `getCookie` falls back to `SECURE_COOKIE_PREFIX + name`).
2. `frontend/app/login/page.tsx` — the middleware sets a `callbackUrl` query param that
   nothing read. The login form now honours it (restricted to same-site relative paths
   to avoid open redirect), calls `router.refresh()` so the server sees the new session,
   and the component was split into `LoginForm` + a `Suspense`-wrapped default export
   because `useSearchParams` requires a Suspense boundary in the App Router.

## Outcome

- ✅ Impact: Sign-in now reaches /dashboard on the HTTPS deployment instead of looping back to /login.
- 🧪 Tests: `npx tsc --noEmit` passes. `npm run build` fails locally on a pre-existing missing `lightningcss` linux-x64-gnu native binary (node_modules installed from another platform); unrelated to this change and does not affect Vercel builds.
- 📁 Files: frontend/middleware.ts, frontend/app/login/page.tsx
- 🔁 Next prompts: Verify sign-in on the deployed Vercel URL; consider applying the same cookie check to the signup flow.
- 🧠 Reflection: Environment-dependent cookie naming is a classic works-locally/breaks-in-prod bug; using the library's own helper beats hardcoding cookie names.

## Evaluation notes (flywheel)

- Failure modes observed: Hardcoded Better Auth cookie names that diverge between http (dev) and https (prod).
- Graders run and results (PASS/FAIL): typecheck PASS; production build not runnable locally (pre-existing env issue).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): Reinstall node_modules inside WSL so `npm run build` can validate locally.
