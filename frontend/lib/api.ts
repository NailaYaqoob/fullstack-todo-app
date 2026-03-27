import type { Task, TaskCreate, TaskUpdate, ChatRequest, ChatResponse, ChatHistoryResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Token retrieval — calls Better Auth's /api/auth/token endpoint
// ---------------------------------------------------------------------------
let tokenCache: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  // Return cached token with a 60-second safety buffer
  if (tokenCache && tokenCache.expiresAt - now > 60_000) {
    return tokenCache.value;
  }
  const res = await fetch("/api/auth/token", { credentials: "include" });
  if (!res.ok) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }
  const { token } = (await res.json()) as { token: string };
  // JWT expires in 15 min; cache for 10 min
  tokenCache = { value: token, expiresAt: now + 10 * 60 * 1000 };
  return token;
}

// ---------------------------------------------------------------------------
// Shared error helper
// ---------------------------------------------------------------------------
async function throwIfError(res: Response): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) {
    tokenCache = null; // invalidate cached token
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired — redirecting to login");
  }
  let detail = res.statusText;
  try {
    const body = (await res.json()) as { detail?: string };
    if (body.detail) detail = body.detail;
  } catch {
    // ignore json parse error
  }
  throw new Error(detail);
}

// ---------------------------------------------------------------------------
// Base fetch with Authorization header
// ---------------------------------------------------------------------------
async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  return fetch(BASE + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}

// ---------------------------------------------------------------------------
// Task API functions
// ---------------------------------------------------------------------------
export async function listTasks(
  userId: string,
  status?: "pending" | "completed"
): Promise<Task[]> {
  const qs = status ? `?status=${status}` : "";
  const res = await fetchWithAuth(`/api/${userId}/tasks${qs}`);
  await throwIfError(res);
  return res.json() as Promise<Task[]>;
}

export async function createTask(
  userId: string,
  data: TaskCreate
): Promise<Task> {
  const res = await fetchWithAuth(`/api/${userId}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  await throwIfError(res);
  return res.json() as Promise<Task>;
}

export async function getTask(userId: string, taskId: string): Promise<Task> {
  const res = await fetchWithAuth(`/api/${userId}/tasks/${taskId}`);
  await throwIfError(res);
  return res.json() as Promise<Task>;
}

export async function updateTask(
  userId: string,
  taskId: string,
  data: TaskUpdate
): Promise<Task> {
  const res = await fetchWithAuth(`/api/${userId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  await throwIfError(res);
  return res.json() as Promise<Task>;
}

export async function deleteTask(
  userId: string,
  taskId: string
): Promise<void> {
  const res = await fetchWithAuth(`/api/${userId}/tasks/${taskId}`, {
    method: "DELETE",
  });
  await throwIfError(res);
}

export async function toggleTask(
  userId: string,
  taskId: string
): Promise<Task> {
  const res = await fetchWithAuth(`/api/${userId}/tasks/${taskId}/toggle`, {
    method: "PATCH",
  });
  await throwIfError(res);
  return res.json() as Promise<Task>;
}

// ---------------------------------------------------------------------------
// Chat API functions (003-chatbot)
// ---------------------------------------------------------------------------
export const chatApi = {
  async send(req: ChatRequest): Promise<ChatResponse> {
    const res = await fetchWithAuth("/api/chat", {
      method: "POST",
      body: JSON.stringify(req),
    });
    await throwIfError(res);
    return res.json() as Promise<ChatResponse>;
  },

  async history(): Promise<ChatHistoryResponse> {
    const res = await fetchWithAuth("/api/chat/history");
    await throwIfError(res);
    return res.json() as Promise<ChatHistoryResponse>;
  },
};
