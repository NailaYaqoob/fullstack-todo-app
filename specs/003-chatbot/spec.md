# Feature Specification: AI-Powered Todo Chatbot

**Feature Branch**: `003-chatbot`
**Created**: 2026-03-25
**Status**: Draft
**Input**: User description: "003-chatbot: AI-Powered Todo Chatbot — conversational interface for managing todos through natural language, using Claude AI, MCP tools, and persisted conversation history."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Send a Message and Create a Task (Priority: P1)

A signed-in user opens the chat panel on the dashboard, types "Add a task: buy groceries", and sees a confirmation reply. The task appears in their task list.

**Why this priority**: Natural language task creation is the core value of the chatbot. Everything else depends on this working first.

**Independent Test**: A signed-in user with an empty task list opens the dashboard, types "Add a task: buy milk" in the chat input, and sends it. The assistant replies confirming the task was created. The task list now shows "buy milk" as pending.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the dashboard, **When** they type "Add a task: buy groceries" and send it, **Then** the assistant replies with a confirmation and the task appears in the task list.
2. **Given** a signed-in user, **When** they type "Create a reminder to call the doctor", **Then** a task titled "call the doctor" (or similar) is created and confirmed in the reply.
3. **Given** a signed-in user types a message with only whitespace as the task title, **When** they send it, **Then** the assistant replies with a helpful error asking for a valid title — no task is created.
4. **Given** a signed-in user supplies a task title over 200 characters, **When** they send it, **Then** the assistant replies that the title is too long.

---

### User Story 2 — View Tasks via Chat (Priority: P2)

A signed-in user types "Show my tasks" and receives a readable list of all their current tasks in the chat reply.

**Why this priority**: Viewing tasks through chat validates the AI's ability to read and summarise the user's data — essential before update/delete operations.

**Independent Test**: A user with 3 tasks types "Show my tasks" and sees all 3 tasks with their titles and completion status in the assistant's reply.

**Acceptance Scenarios**:

1. **Given** a user with 3 tasks, **When** they type "Show my tasks", **Then** the assistant lists all 3 tasks with titles and completion status.
2. **Given** a user with no tasks, **When** they type "What are my tasks?", **Then** the assistant replies that no tasks were found.
3. **Given** a user with mixed tasks, **When** they type "Show my pending tasks", **Then** only incomplete tasks are listed.
4. **Given** a user with mixed tasks, **When** they type "Show completed tasks", **Then** only completed tasks are listed.

---

### User Story 3 — Mark a Task Complete via Chat (Priority: P3)

A signed-in user types "Mark 'buy groceries' as done" and the task is toggled to completed. The chat reply confirms the change.

**Why this priority**: Completing tasks is the primary lifecycle transition; natural language completion is high-value once tasks exist.

**Independent Test**: A user with a pending task "buy groceries" types "Mark buy groceries as done". The assistant confirms, and the task list shows the task as completed.

**Acceptance Scenarios**:

1. **Given** a user with a pending task "buy groceries", **When** they say "Mark buy groceries as done", **Then** the assistant confirms and the task is marked completed.
2. **Given** a user references a task that does not exist, **When** they say "Mark 'unknown task' as done", **Then** the assistant replies that the task was not found.
3. **Given** a completed task, **When** a user says "Reopen buy groceries", **Then** the task is toggled back to pending and the assistant confirms.

---

### User Story 4 — Update a Task via Chat (Priority: P4)

A signed-in user types "Rename 'buy groceries' to 'buy groceries and snacks'" and the task title is updated and confirmed in the chat.

**Why this priority**: Task editing completes the core CRUD story; less frequent than creation and viewing.

**Independent Test**: A user with a task "buy groceries" says "Rename buy groceries to buy groceries and snacks". The assistant confirms and the task list reflects the updated title.

**Acceptance Scenarios**:

1. **Given** a user with task "buy groceries", **When** they say "Rename buy groceries to buy groceries and snacks", **Then** the task is updated and the assistant confirms.
2. **Given** a user tries to update a non-existent task, **Then** the assistant replies that the task was not found.
3. **Given** a user provides a new title over 200 characters, **Then** the assistant replies that the title is too long and the task is not updated.

---

### User Story 5 — Delete a Task via Chat (Priority: P5)

A signed-in user types "Delete the task 'buy groceries'" and the task is permanently removed.

**Why this priority**: Deletion is the final CRUD operation; less frequent than other actions.

**Independent Test**: A user says "Delete buy groceries". The assistant confirms deletion and the task no longer appears in the task list.

**Acceptance Scenarios**:

1. **Given** a user with task "buy groceries", **When** they say "Delete buy groceries", **Then** the task is removed and the assistant confirms.
2. **Given** a user tries to delete a non-existent task, **Then** the assistant reports the task was not found.

---

### User Story 6 — Conversation History Persists Across Sessions (Priority: P6)

A signed-in user refreshes the page and sees their previous chat messages and assistant replies in the chat panel.

**Why this priority**: Persistence is expected behaviour for any chat interface; a quality-of-life requirement rather than core functionality.

**Independent Test**: A user sends 3 messages, refreshes the page, and sees all 3 messages and replies in the chat panel in the correct order.

**Acceptance Scenarios**:

1. **Given** a user has sent 3 chat messages, **When** they refresh the page, **Then** all messages and replies are visible in the chat panel in order.
2. **Given** a user opens the dashboard in a new browser tab (same account), **When** the chat panel loads, **Then** their prior conversation history is visible.

---

### Edge Cases

- What happens when the AI cannot understand the user's intent? The assistant replies with a helpful message saying it did not understand and asks the user to rephrase.
- What happens when an AI tool call fails due to a database error? The assistant replies with a generic error message; the error is logged server-side; no silent failures.
- What happens when the user sends an empty message? The send button is disabled until the user types at least one non-whitespace character; no request is made.
- What happens when the message exceeds a reasonable length? Client enforces a 2000-character limit with a visible character count warning.
- What happens if conversation history grows very large? Only the most recent 20 messages are passed as context per request; older history is stored in the database but not sent to the AI.
- What if a user attempts to access another user's tasks via the chat? AI tools are scoped to the authenticated user's data; cross-user access is structurally impossible.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a chat panel on the dashboard where authenticated users can send natural language messages and receive replies.
- **FR-002**: The system MUST accept natural language messages and produce a meaningful text reply for every message sent.
- **FR-003**: Users MUST be able to create tasks by describing them in natural language (e.g., "Add a task: buy groceries").
- **FR-004**: Users MUST be able to list their tasks via natural language (e.g., "Show my tasks", "What are my pending tasks?").
- **FR-005**: Users MUST be able to mark a task as complete or incomplete via natural language.
- **FR-006**: Users MUST be able to update a task's title or description via natural language.
- **FR-007**: Users MUST be able to delete a task via natural language.
- **FR-008**: The system MUST store every chat message (user and assistant) in the database, associated with the authenticated user and their conversation.
- **FR-009**: The system MUST load and display the user's conversation history when they open the dashboard.
- **FR-010**: AI task tools MUST only operate on tasks belonging to the authenticated user — cross-user task access is prohibited at all levels.
- **FR-011**: The chat endpoint MUST require authentication; unauthenticated requests MUST be rejected.
- **FR-012**: When the AI cannot determine user intent, it MUST reply with a helpful, human-readable message rather than returning a blank response or raw error.
- **FR-013**: The system MUST pass a bounded window of recent conversation messages (no more than 20) as context to the AI on each request to maintain conversational coherence.
- **FR-014**: The send button MUST be disabled while a response is pending to prevent duplicate submissions.

### Key Entities

- **ChatMessage**: A single turn in a conversation. Has a role (user or assistant), text content, a timestamp, and belongs to a user and a conversation. Stored persistently.
- **Conversation**: A logical thread of messages for a user. Auto-created if one does not exist. One active conversation per user in Phase III.
- **AI Tool**: A named, scoped operation the AI can invoke on behalf of the authenticated user (create_task, list_tasks, update_task, delete_task, toggle_complete). Tools are bound to the authenticated user's identity — no user-supplied user IDs accepted.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a task via natural language in under 10 seconds from typing to seeing the confirmation reply.
- **SC-002**: A user can list their tasks via natural language and receive a reply within 10 seconds.
- **SC-003**: The assistant correctly interprets clearly phrased requests for the 5 core task operations (create, list, complete, update, delete) at least 90% of the time.
- **SC-004**: Conversation history is visible immediately on page load — no additional user action required.
- **SC-005**: The chat panel is visible and usable on the dashboard page without any navigation — embedded alongside the task list.
- **SC-006**: Every user message always results in a human-readable reply — the system never displays a blank or raw error to the user.

---

## Scope

### In Scope

- Chat panel embedded on the dashboard page alongside the existing task list
- Natural language task management: create, list, toggle-complete, update, delete
- Conversation history stored in the database and loaded on page load
- Single conversation thread per user (auto-created if none exists)
- Non-streaming chat responses (request/response — no real-time token streaming)
- JWT-authenticated chat endpoint
- AI tools scoped to the authenticated user's data only

### Out of Scope

- Voice input or speech-to-text
- File or image attachments
- Multiple simultaneous conversation threads per user
- Real-time token streaming (Phase IV)
- Custom-built chat UI components (ChatKit handles the UI layer)
- User-selectable AI models or providers
- Push notifications or webhooks
- Admin or moderation tooling for chat content
- Automatic task list refresh after AI tool calls

---

## Assumptions

- The user is already authenticated on the dashboard — no extra sign-in is required to use the chat panel.
- One active conversation thread per user is sufficient for Phase III.
- A context window of the most recent 20 messages provides adequate conversational coherence for typical use.
- The AI may occasionally misinterpret ambiguous messages — this is acceptable as long as it always produces a readable reply (SC-006).
- The conversations table schema (fields: id, conversation_id, user_id, role, content, created_at) will be created automatically at backend startup alongside the existing task table.
- Task list state on the dashboard is not automatically refreshed after AI tool calls; the user must manually refresh the task list to see AI-driven changes.
- **Technology preference (informs planning)**: The chat UI will use OpenAI ChatKit; the AI agent will be built with the OpenAI Agents SDK; the MCP server will use the Official MCP SDK. An OPENAI_API_KEY environment variable must be available in the backend environment.

---

## Dependencies

- **001-task-crud**: Task CRUD operations must be fully implemented — AI tools wrap the same underlying task data.
- **002-user-auth**: JWT authentication must be in place — the chat endpoint requires a valid JWT.
- **Neon PostgreSQL**: The conversations table will be created at backend startup.
- **OPENAI_API_KEY**: Must be set in backend/.env before the chat endpoint can process messages.
- **OpenAI ChatKit**: Frontend UI library for the chat panel (replaces custom React component).
- **OpenAI Agents SDK**: Backend AI agent framework for processing natural language and calling MCP tools.
- **Official MCP SDK**: Python MCP server exposing task operations as tools to the AI agent.
