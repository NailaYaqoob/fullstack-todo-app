# Feature: AI-Powered Todo Chatbot

**Phase**: III (AI Chatbot)
**Status**: Pending

## Overview
An AI-powered conversational interface for managing todos through natural language. Built with OpenAI Agents SDK, an MCP server exposing task operations as tools, and a stateless chat endpoint backed by Neon PostgreSQL for conversation history.

## User Stories

- As a user, I can say "Add a task: buy groceries" and the task is created
- As a user, I can say "Show my tasks" and see my task list in the chat
- As a user, I can say "Mark 'buy groceries' as done" and it is completed
- As a user, I can say "Reschedule my morning meetings to 2 PM" and they are updated
- As a user, my conversation history persists across sessions

## Acceptance Criteria

### Conversational Interface
- Integrates OpenAI ChatKit UI component on the frontend
- Supports natural language for all Basic Level task operations (add, delete, update, view, mark complete)
- Returns helpful error messages when intent is unclear

### AI Agent
- Uses OpenAI Agents SDK to process user messages
- Agent is equipped with MCP tools for all task operations
- Stateless — no in-memory session state; all state stored in database

### MCP Server
- Built with the Official MCP SDK
- Exposes tools: `create_task`, `list_tasks`, `update_task`, `delete_task`, `toggle_complete`
- Each tool validates inputs and returns structured results
- Authenticated — respects user identity from JWT context

### Conversation Persistence
- Each chat message (user + assistant) stored in `conversations` table
- Chat history loaded on page refresh
- Endpoint is stateless — conversation history passed in each request or loaded from DB

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend UI | OpenAI ChatKit |
| AI Framework | OpenAI Agents SDK |
| MCP Server | Official MCP SDK |
| Backend | FastAPI |
| Database | Neon PostgreSQL (SQLModel) |
| Auth | Better Auth + JWT |

## Architecture

```
User Message
    ↓
ChatKit UI (Frontend)
    ↓ POST /api/chat
FastAPI Chat Endpoint
    ↓
OpenAI Agents SDK (processes message + history)
    ↓ calls tools via
MCP Server (Official SDK)
    ↓
SQLModel + Neon DB (task operations)
    ↓
Response streamed back to ChatKit
```

## Related Specs
- `@specs/api/mcp-tools.md` — MCP tool definitions
- `@specs/database/schema.md` — `conversations` table
- `@specs/features/task-crud.md` — underlying task operations
