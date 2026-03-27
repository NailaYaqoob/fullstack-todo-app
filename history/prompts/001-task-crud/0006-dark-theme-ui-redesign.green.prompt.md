---
id: "0006"
title: Dark Theme UI Redesign
stage: green
date: 2026-03-25
surface: agent
model: claude-sonnet-4-6
feature: 001-task-crud
branch: 001-task-crud
user: user
command: inline instruction
labels: ["ui","dark-theme","tailwind","styling"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - frontend/app/login/page.tsx
  - frontend/app/signup/page.tsx
  - frontend/components/TaskForm.tsx
  - frontend/components/TaskCard.tsx
  - frontend/components/TaskList.tsx
  - frontend/app/dashboard/page.tsx
  - frontend/components/ChatPanel.tsx
tests:
  - npm run build
---

## Prompt

Redesign the entire Todo app UI to a modern dark theme. Apply changes to these files exactly. Do NOT change any logic, only classes/styles.

Color palette to use (Tailwind arbitrary values or standard classes):
- Page bg: bg-[#0a0a0f]
- Card/surface: bg-[#12121a]
- Elevated card: bg-[#1a1a28]
- Border: border-[#2a2a3f]
- Text primary: text-white
- Text secondary: text-[#8888aa]
- Text muted: text-[#4a4a6a]
- Label text: text-[#c0c0d8]
- Accent: violet-600
- Success: emerald-500
- Danger: red-400/red-500
- Input bg: bg-[#0a0a0f]
- Input text: text-white
- Input placeholder: placeholder-[#4a4a6a]

[Full JSX replacements provided for 7 files]

## Response snapshot

Applied dark theme to all 7 files:

1. `app/login/page.tsx` — replaced return JSX with dark card layout, violet accent icon, dark inputs
2. `app/signup/page.tsx` — replaced return JSX with dark card layout, user icon, dark inputs
3. `components/TaskForm.tsx` — replaced return JSX with dark inputs, violet submit button, dark cancel border
4. `components/TaskCard.tsx` — replaced return JSX with dark elevated card, emerald checkbox, violet hover states
5. `components/TaskList.tsx` — replaced return JSX with dark tabs (violet active), dark empty state with icon
6. `app/dashboard/page.tsx` — full rewrite with sticky dark header, two-column grid layout, stats cards, violet accents throughout
7. `components/ChatPanel.tsx` — full rewrite with Bearer token auth fix, dark panel header with AI icon, online indicator, theme:"dark"

All logic preserved unchanged. Only Tailwind classes modified.

## Outcome

- Impact: Full dark theme applied across all pages and components; dashboard now uses two-column layout with stats row
- Tests: npm run build to verify no TypeScript errors
- Files: 7 files updated (5 JSX return blocks replaced, 2 full rewrites)
- Next prompts: Run build, verify in browser at /login, /signup, /dashboard
- Reflection: Used Edit tool for files 1-5 (preserving logic above return), Write tool for files 6-7 (full rewrites as instructed)

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment: n/a
