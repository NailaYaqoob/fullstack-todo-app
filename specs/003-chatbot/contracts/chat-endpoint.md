# Contract: Chat Endpoint

**Feature**: `003-chatbot` | **Date**: 2026-03-25
**Location**: `backend/routers/chat.py`

---

## POST /api/chat

Process a natural language message from the authenticated user. Runs the AI agent
with full conversation history as context, executes any MCP tool calls, persists
the exchange, and returns the assistant reply.

**Authentication**: `Authorization: Bearer <JWT>` required (Principle II).
Missing or invalid token → `403` (HTTPBearer default) or `401`.

### Request

```json
{
  "message": "Add a task: buy groceries",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `message` | string | ✅ | User's natural language input. 1–2000 chars. |
| `conversation_id` | string (UUID) | ❌ | Omit on first message; server auto-creates. |

### Response `200 OK`

```json
{
  "reply": "I've created the task 'buy groceries' for you! ✅",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `reply` | string | Assistant's text response. Always present; never blank. |
| `conversation_id` | string (UUID) | Echo back the thread ID. Store on frontend for next request. |

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| 403 | Missing `Authorization` header | HTTPBearer default |
| 401 | Invalid or expired JWT | `{"detail": "Invalid or expired token"}` |
| 422 | `message` empty or over 2000 chars | FastAPI validation error |
| 500 | AI agent or DB failure | `{"detail": "Chat service error"}` — never exposes raw exception |

### Behaviour Notes

1. **Auto-create conversation**: If `conversation_id` is absent or unknown, server
   checks for an existing thread for the user. If found, reuses it. If none, creates
   a new UUID.
2. **History loading**: Loads last 20 messages for the conversation thread.
3. **Persistence**: Both the user message and the assistant reply are saved to the
   `conversation` table before returning.
4. **User isolation**: `user_id` is extracted from JWT — never from the request body.
   MCP tools receive `user_id` via environment variable injection, not from any
   user-supplied field.
5. **No streaming**: Response is a single JSON object. Streaming is Phase IV.

### Implementation Sketch

```python
@router.post("/api/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # 1. Resolve conversation_id
    conv_id = body.conversation_id or await _get_or_create_conversation(
        current_user_id, session
    )

    # 2. Load history (last 20 messages)
    history = await _load_history(conv_id, session)

    # 3. Run AI agent with MCPServerStdio
    try:
        reply = await _run_agent(current_user_id, history, body.message)
    except Exception:
        raise HTTPException(status_code=500, detail="Chat service error")

    # 4. Persist user message + assistant reply
    session.add(Conversation(conversation_id=conv_id, user_id=current_user_id,
                              role="user", content=body.message))
    session.add(Conversation(conversation_id=conv_id, user_id=current_user_id,
                              role="assistant", content=reply))
    await session.commit()

    return ChatResponse(reply=reply, conversation_id=conv_id)
```

---

## GET /api/chat/history

Load full conversation history for the authenticated user.

**Authentication**: `Authorization: Bearer <JWT>` required.

### Response `200 OK`

```json
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "messages": [
    {"role": "user",      "content": "Add a task: buy groceries", "created_at": "2026-03-25T10:00:00Z"},
    {"role": "assistant", "content": "Done! Task 'buy groceries' created.", "created_at": "2026-03-25T10:00:02Z"}
  ]
}
```

Returns ALL stored messages (not capped at 20) for display in the UI. The 20-message
cap applies only to the AI context window, not to the history endpoint.

If no conversation exists yet: returns `{"conversation_id": null, "messages": []}`.
