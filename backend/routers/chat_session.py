"""
backend/routers/chat_session.py

GET /api/chat/session — creates an ephemeral OpenAI client secret for the
ChatKit web component. The browser never receives your OPENAI_API_KEY;
it only gets a short-lived token scoped to your Agent Builder workflow.
"""
import os

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI

from dependencies import get_current_user

router = APIRouter()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
# Your Agent Builder workflow ID — set in backend/.env
AGENT_WORKFLOW_ID = os.getenv("AGENT_WORKFLOW_ID", "")


@router.get("/api/chat/session")
async def get_chat_session(
    current_user_id: str = Depends(get_current_user),
):
    """
    Return a short-lived OpenAI client secret for the ChatKit web component.

    Uses client.beta.chatkit.sessions.create() — the correct API for
    Agent Builder + ChatKit text sessions (not the Realtime voice API).
    """
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY not configured",
        )
    if not AGENT_WORKFLOW_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AGENT_WORKFLOW_ID not configured",
        )

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)

        # Creates an ephemeral session scoped to your Agent Builder workflow.
        # client_secret is returned as a plain string on the ChatSession object.
        session = client.beta.chatkit.sessions.create(
            user=current_user_id,
            workflow={"id": AGENT_WORKFLOW_ID},
        )
        return {"client_secret": session.client_secret}

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat session: {exc}",
        )
