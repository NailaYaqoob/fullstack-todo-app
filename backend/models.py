import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator
from sqlmodel import SQLModel, Field


# ---------------------------------------------------------------------------
# Conversation (003-chatbot) — append-only message rows
# ---------------------------------------------------------------------------
class Conversation(SQLModel, table=True):
    """Each row is one chat turn (user message or assistant reply)."""
    __tablename__ = "conversation"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    conversation_id: str = Field(index=True)   # groups messages into a thread
    user_id: str = Field(index=True)            # References Better Auth user.id
    role: str                                   # "user" | "assistant"
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatRequest(SQLModel):
    """Request body for POST /api/chat."""
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: Optional[str] = None


class ChatResponse(SQLModel):
    """Response shape for POST /api/chat."""
    reply: str
    conversation_id: str


class TaskBase(SQLModel):
    """Shared validation for create and update operations."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("title")
    @classmethod
    def title_not_whitespace(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Title must contain at least one non-whitespace character")
        return stripped


class Task(TaskBase, table=True):
    """Database table — managed by SQLModel / create_db_and_tables()."""
    __tablename__ = "task"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: str = Field(index=True)         # References Better Auth user.id
    completed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskCreate(TaskBase):
    """Request body for POST /tasks. Inherits title + description validation."""
    pass


class TaskRead(TaskBase):
    """Response shape for all task endpoints."""
    id: uuid.UUID
    user_id: str
    completed: bool
    created_at: datetime
    updated_at: datetime


class TaskUpdate(SQLModel):
    """Request body for PATCH /tasks/{id}. All fields optional."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("title")
    @classmethod
    def title_not_whitespace(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            raise ValueError("Title must contain at least one non-whitespace character")
        return stripped


class UserRead(BaseModel):
    """Type hint only — Better Auth manages the user table; no table=True here."""
    id: str
    name: str
    email: str
    created_at: datetime
