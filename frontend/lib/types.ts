// Task entity — matches FastAPI snake_case JSON output exactly
export interface Task {
  id: string;           // UUID as string
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string;   // ISO 8601 datetime
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Chat types (003-chatbot)
// ---------------------------------------------------------------------------
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string; // ISO 8601
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  reply: string;
  conversation_id: string;
}

export interface ChatHistoryResponse {
  conversation_id: string | null;
  messages: ChatMessage[];
}
