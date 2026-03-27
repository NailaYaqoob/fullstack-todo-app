---
id: "0002"
title: Chatbot spec tech stack correction
stage: spec
date: 2026-03-25
surface: agent
model: claude-sonnet-4-6
feature: 003-chatbot
branch: 003-chatbot
user: Naila Imran
command: (correction)
labels: ["spec","chatbot","openai","chatkit","agents-sdk","mcp"]
links:
  spec: specs/003-chatbot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/003-chatbot/spec.md
  - specs/overview.md
tests: []
---

## Prompt

Phase III | AI-Powered Todo Chatbot | OpenAI ChatKit, Agents SDK, Official MCP SDK
I want to create chatbot using chat kit in openai agentsdk

## Response snapshot

User corrected the technology stack for Phase III. Updated spec.md and overview.md:

- **Chat UI**: OpenAI ChatKit (replaces custom React component)
- **AI Agent**: OpenAI Agents SDK (replaces Claude API)
- **MCP Server**: Official MCP SDK (Python) — unchanged
- **API Key**: OPENAI_API_KEY (replaces ANTHROPIC_API_KEY)

Changes made:
1. `specs/003-chatbot/spec.md` — Updated Assumptions section with technology preference note;
   updated Dependencies section to list OpenAI ChatKit, Agents SDK, MCP SDK, OPENAI_API_KEY;
   updated Out of Scope to note custom chat UI is out of scope (ChatKit handles it)
2. `specs/overview.md` — Added Phase III tech stack line: OpenAI Agents SDK, ChatKit, MCP SDK

## Outcome

- ✅ Impact: Spec now correctly reflects user's chosen technology stack for Phase III
- 🧪 Tests: n/a (spec amendment)
- 📁 Files: specs/003-chatbot/spec.md, specs/overview.md
- 🔁 Next prompts: `/sp.plan` to generate the architecture plan using OpenAI Agents SDK + ChatKit + MCP SDK
- 🧠 Reflection: Technology preferences recorded in Assumptions (not requirements) to keep spec layer technology-agnostic while ensuring the plan picks up the correct stack

## Evaluation notes (flywheel)

- Failure modes observed: Initial spec used Claude API — user corrected to OpenAI stack
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment: n/a
