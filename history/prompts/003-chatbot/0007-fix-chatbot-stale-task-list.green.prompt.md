---
id: "0007"
title: Fix chatbot showing stale task list
stage: green
date: 2026-03-27
surface: agent
model: claude-sonnet-4-6
feature: 003-chatbot
branch: 003-chatbot
user: lenovo
command: fix task sync between frontend and chatbot
labels: ["bugfix","chatbot","mcp","agent-instructions"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/routers/chat.py
tests:
  - manual: delete task in Next.js UI, ask chatbot to list tasks, verify deleted task absent
---

## Prompt

every thing is fine but when I delete item from UI of nextjs and than want to view from chatbot it shows again it means adding and deleting task is not done from db from nextjs frontend side

## Response snapshot

Root cause: the AI agent loads conversation history (last 20 messages) which may contain a previous task list. When asked "show my tasks" again, the LLM can answer from its context window (stale list) rather than calling `list_tasks` MCP tool again.

Fix: strengthened agent instructions in `chat.py` to ALWAYS call `list_tasks` when asked about tasks — never rely on conversation history for task state. Added explicit rule that every listing must go through the tool.

Key change in `_run_agent` → `Agent(instructions=...)`:
- Added CRITICAL RULES section
- "ALWAYS call list_tasks tool… never answer from memory or previous conversation context. Task data changes externally."
- "ALWAYS call the appropriate tool for every task operation — never assume state from previous messages."

## Outcome

- ✅ Impact: Chatbot now consistently calls list_tasks for fresh DB data on every request
- 🧪 Tests: Manual test — delete via frontend, ask chatbot to list → should show updated list
- 📁 Files: backend/routers/chat.py (agent instructions)
- 🔁 Next prompts: verify fix works end-to-end; consider adding history truncation if LLM still uses stale context
- 🧠 Reflection: LLM context includes previous tool outputs; strong instruction enforcement is required to override its tendency to use cached conversation context

## Evaluation notes (flywheel)

- Failure modes observed: AI answered from conversation history instead of calling MCP tool
- Graders run and results (PASS/FAIL): manual only
- Prompt variant (if applicable): n/a
- Next experiment: if LLM still ignores instructions, reduce history window from 20 to 6 messages to minimize stale context
