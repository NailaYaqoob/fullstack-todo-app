# Research: AI-Powered Todo Chatbot

**Feature**: `003-chatbot` | **Date**: 2026-03-25

---

## Decision 1: AI Agent Framework

**Decision**: Use `openai-agents` (v0.13.1) — the OpenAI Agents SDK for Python.

**Rationale**: Explicitly requested by user. Provides first-class MCP server support via
`MCPServerStdio`, built-in conversation history handling, and a simple `Runner.run()`
API that is stateless (no in-memory session — history passed as input messages).

**Install**: `pip install openai-agents==0.13.1`

**Core pattern**:
```python
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

async def run_agent(user_id: str, history: list[dict], user_message: str) -> str:
    async with MCPServerStdio(
        params={"command": "python", "args": ["mcp_server.py"]},
        env={"USER_ID": user_id, "DATABASE_URL": os.getenv("DATABASE_URL", "")}
    ) as mcp_server:
        agent = Agent(
            name="Todo Assistant",
            instructions=(
                "You help the authenticated user manage their tasks. "
                "Use the available tools to create, list, update, delete, "
                "and toggle tasks. Always confirm actions taken. "
                "If you cannot understand the user's intent, ask them to rephrase."
            ),
            mcp_servers=[mcp_server],
        )
        input_messages = history + [{"role": "user", "content": user_message}]
        result = await Runner.run(agent, input=input_messages)
        return result.final_output
```

**Alternatives considered**:
- LangChain + LangGraph: Heavier framework, more complex MCP integration
- Direct OpenAI function calling: Loses MCP abstraction, more boilerplate
- Claude API + MCP: Not requested; user specified OpenAI

---

## Decision 2: MCP Server

**Decision**: Use `mcp` (v1.26.0) with `FastMCP` — the Official Python MCP SDK.

**Rationale**: Official SDK from modelcontextprotocol. `FastMCP` provides a decorator-based
tool definition pattern that is clean and minimal. Runs as a stdio subprocess, connected
to by the Agents SDK via `MCPServerStdio`.

**Install**: `pip install mcp==1.26.0`

**User ID injection strategy**: The FastAPI chat endpoint passes `USER_ID` as an
environment variable when spawning the MCP subprocess via `MCPServerStdio(env={...})`.
The MCP tool handlers read this from `os.environ["USER_ID"]`.

**Core pattern**:
```python
# backend/mcp_server.py
import os
from mcp.server.fastmcp import FastMCP
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

mcp = FastMCP("Todo Tools")

@mcp.tool()
async def create_task(title: str, description: str = "") -> dict:
    """Create a new task for the authenticated user."""
    user_id = os.environ["USER_ID"]
    # ... db operations using user_id
    return {"id": str(task.id), "title": task.title, "completed": task.completed}

@mcp.tool()
async def list_tasks(status: str = "all") -> list[dict]:
    """List tasks. status: 'all', 'pending', or 'completed'."""
    user_id = os.environ["USER_ID"]
    # ... query filtered by user_id

if __name__ == "__main__":
    mcp.run()  # runs as stdio server
```

**Alternatives considered**:
- MCPServerSSE (HTTP-based): More complex, requires a running HTTP server
- Direct Python function tools (no MCP): Simpler but violates spec requirement for MCP SDK
- Custom tool wrappers: More boilerplate, loses MCP interoperability

---

## Decision 3: Chat UI Frontend

**Decision**: Use `@openai/chatkit` (v1.6.0) for the chat panel UI.

**Rationale**: Explicitly requested by user. Package exists and is at v1.6.0.

**Install**: `npm install @openai/chatkit`

**Integration approach**: Since our backend uses a custom JWT-protected REST endpoint
(`POST /api/chat`), not the OpenAI Responses API directly, `@openai/chatkit` will be
used for its UI components (message display, input box) while wiring the submission
handler to our backend. The component receives messages as props and calls our
`fetchWithAuth` from `lib/api.ts`.

**Fallback**: If `@openai/chatkit` components require direct OpenAI API access and
cannot be wired to a custom backend, a minimal custom React chat component (~60 lines)
will be used instead. This decision is made at implementation time (T-ChatKit task).

**Note on @openai/chatkit API surface**: The exact component names and props should be
verified during implementation via `node_modules/@openai/chatkit/README.md` or TypeScript
types. Common patterns are `<Thread>`, `<MessageInput>`, or a unified `<ChatKit>` wrapper.

**Alternatives considered**:
- Vercel AI SDK `useChat` + custom UI: Well-documented but streaming-focused
- `@assistant-ui/react` (v0.12.20): Available but not requested
- Custom React component: Simple fallback (~60 lines), no dependency risk

---

## Decision 4: Conversation Persistence Strategy

**Decision**: Store each message (user + assistant) as an individual row in a
`conversation` table. Use a `conversation_id` UUID to group messages per thread.
One thread per user; auto-create on first request.

**Rationale**: Simple to query, append-only writes, natural fit for SQLModel.
Loading history = `SELECT * FROM conversation WHERE user_id=? ORDER BY created_at ASC LIMIT 20`.

**Context window**: Pass the last 20 messages as `input` to `Runner.run()`. Older
history is stored but not sent to the AI to keep token costs bounded.

**Conversation ID management**:
- Backend: If request includes no `conversation_id`, check DB for existing thread for
  user. If found, use it. If none, create a new UUID.
- Frontend: Store `conversation_id` in component state (persists across renders;
  loaded from first API response and reused).

---

## Decision 5: Async MCP Subprocess and Windows Compatibility

**Decision**: Use `MCPServerStdio` with `asyncio`-compatible subprocess management.
On Windows, the same `WindowsSelectorEventLoopPolicy` set in `run.py` applies.

**Risk**: Each chat request spawns a Python subprocess. For low-traffic apps this
is acceptable. If throughput becomes a concern, a persistent MCP server with
`MCPServerSSE` can replace this in a later phase.

**Mitigation**: The `async with MCPServerStdio(...)` context manager handles
subprocess lifecycle (start + kill) automatically.

---

## Package Summary

| Package | Version | Install | Purpose |
|---------|---------|---------|---------|
| `openai-agents` | 0.13.1 | `pip install openai-agents` | AI agent + MCP client |
| `mcp` | 1.26.0 | `pip install mcp` | MCP server (FastMCP) |
| `openai` | latest | bundled with openai-agents | OpenAI API client |
| `@openai/chatkit` | 1.6.0 | `npm install @openai/chatkit` | Chat UI components |

**New env var**: `OPENAI_API_KEY` must be added to `backend/.env` and noted in
`backend/.env.example`.
