"""
backend/routers/chat.py — AI chatbot endpoints.

POST /api/chat    — send a message; AI agent runs tools via MCP; reply persisted
GET  /api/chat/history — load full conversation history for the authenticated user
"""
import asyncio
import concurrent.futures
import os
import sys
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from db import get_session
from dependencies import get_current_user
from models import ChatRequest, ChatResponse, Conversation

router = APIRouter()

# Absolute path to mcp_server.py (one directory above this file, i.e. backend/)
_MCP_SERVER_PATH = str(Path(__file__).resolve().parent.parent / "mcp_server.py")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _get_or_create_conversation(user_id: str, session: AsyncSession) -> str:
    """Return the existing conversation_id for this user, or create a new one."""
    stmt = (
        select(Conversation.conversation_id)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.asc())
        .limit(1)
    )
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    return existing if existing else str(uuid.uuid4())


async def _load_history(conv_id: str, session: AsyncSession) -> list[dict]:
    """Load the last 20 messages for the conversation, in chronological order."""
    stmt = (
        select(Conversation)
        .where(Conversation.conversation_id == conv_id)
        .order_by(Conversation.created_at.desc())
        .limit(20)
    )
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [{"role": r.role, "content": r.content} for r in reversed(rows)]


async def _run_agent(user_id: str, history: list[dict], message: str) -> str:
    """Run the OpenAI AI agent with MCP tools.

    MCPServerStdio requires asyncio.create_subprocess_exec, which needs
    ProactorEventLoop on Windows. The main FastAPI loop uses SelectorEventLoop
    (for asyncpg compatibility). We run the agent in a thread with its own
    ProactorEventLoop to avoid the conflict.
    """
    from agents import Agent, Runner
    from agents.mcp import MCPServerStdio

    async def _inner() -> str:
        async with MCPServerStdio(
            params={
                "command": sys.executable,
                "args": [_MCP_SERVER_PATH],
                "env": {
                    **os.environ,
                    "USER_ID": user_id,
                    "DATABASE_URL": os.getenv("DATABASE_URL", ""),
                },
            },
            client_session_timeout_seconds=60,  # generous timeout for subprocess start + DB connect
        ) as mcp_server:
            agent = Agent(
                name="Todo Assistant",
                instructions=(
                    "You are a task management assistant. Help the user manage their tasks.\n\n"
                    "CRITICAL RULES:\n"
                    "1. ALWAYS call the list_tasks tool when the user asks to see, show, or list tasks — "
                    "never answer from memory or previous conversation context. Task data changes externally.\n"
                    "2. ALWAYS call the appropriate tool for every task operation — never assume the state "
                    "from previous messages.\n"
                    "3. After any create/update/delete/toggle action, call list_tasks to confirm the current state.\n\n"
                    "Available tools:\n"
                    "- list_tasks: get current task list (use this EVERY time, even if asked before)\n"
                    "- create_task: add a new task\n"
                    "- toggle_complete: mark a task done/undone\n"
                    "- update_task: edit title or description\n"
                    "- delete_task: permanently remove a task\n\n"
                    "Always confirm what action you took and show the updated result."
                ),
                mcp_servers=[mcp_server],
            )
            input_messages = history + [{"role": "user", "content": message}]
            result = await Runner.run(agent, input=input_messages, max_turns=10)
            return result.final_output

    def _run_in_thread() -> str:
        """Run in a dedicated thread with its own event loop.

        On Windows the main process uses SelectorEventLoop (asyncpg requirement)
        but subprocess creation needs ProactorEventLoop. A fresh thread avoids
        the conflict.
        """
        if sys.platform == "win32":
            loop = asyncio.ProactorEventLoop()
        else:
            loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(_inner())
        finally:
            loop.close()
            asyncio.set_event_loop(None)

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_run_in_thread)
        return await asyncio.get_event_loop().run_in_executor(None, future.result)


# ---------------------------------------------------------------------------
# POST /api/chat  (US1–US5)
# ---------------------------------------------------------------------------
@router.post("/api/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # 1. Resolve conversation thread
    if body.conversation_id:
        conv_id = body.conversation_id
    else:
        conv_id = await _get_or_create_conversation(current_user_id, session)

    # 2. Load last 20 messages as context
    history = await _load_history(conv_id, session)

    # 3. Run AI agent
    try:
        reply = await _run_agent(current_user_id, history, body.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat service error: {exc}")

    # 4. Persist user message + assistant reply
    session.add(
        Conversation(
            conversation_id=conv_id,
            user_id=current_user_id,
            role="user",
            content=body.message,
        )
    )
    session.add(
        Conversation(
            conversation_id=conv_id,
            user_id=current_user_id,
            role="assistant",
            content=reply,
        )
    )
    await session.commit()

    return ChatResponse(reply=reply, conversation_id=conv_id)


# ---------------------------------------------------------------------------
# GET /api/chat/history  (US6)
# ---------------------------------------------------------------------------
@router.get("/api/chat/history")
async def chat_history(
    current_user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == current_user_id)
        .order_by(Conversation.created_at.asc())
    )
    result = await session.execute(stmt)
    rows = result.scalars().all()

    if not rows:
        return {"conversation_id": None, "messages": []}

    return {
        "conversation_id": rows[0].conversation_id,
        "messages": [
            {
                "role": r.role,
                "content": r.content,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }
