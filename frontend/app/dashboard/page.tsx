"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
} from "@/lib/api";
import type { Task, TaskCreate } from "@/lib/types";
import ChatPanel, { TASKS_CHANGED_EVENT } from "@/components/ChatPanel";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const userId = session?.user?.id ?? "";

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listTasks(userId);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
      return;
    }
    if (userId) {
      fetchTasks();
    }
  }, [userId, isPending, session, router, fetchTasks]);

  // Refresh tasks when ChatPanel tool calls modify data
  useEffect(() => {
    const handler = () => { if (userId) fetchTasks(); };
    window.addEventListener(TASKS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, handler);
  }, [userId, fetchTasks]);

  async function handleCreate(data: TaskCreate) {
    const newTask = await createTask(userId, data);
    setTasks((prev) => [newTask, ...prev]);
  }

  async function handleToggle(taskId: string) {
    try {
      const updated = await toggleTask(userId, taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle task");
    }
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
  }

  async function handleUpdate(data: TaskCreate) {
    if (!editingTask) return;
    const updated = await updateTask(userId, editingTask.id, data);
    setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
    setEditingTask(null);
  }

  async function handleDelete(taskId: string) {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await deleteTask(userId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2a2a3f] border-t-violet-500" />
          <p className="text-sm text-[#8888aa]">Loading…</p>
        </div>
      </main>
    );
  }

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#2a2a3f] bg-[#0a0a0f]/90 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-base font-semibold text-white">TaskAI</h1>
          </div>
          <div className="flex items-center gap-3">
            {session?.user?.name && (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/20 border border-violet-500/30">
                  <span className="text-xs font-medium text-violet-400">
                    {session.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden text-sm text-[#8888aa] sm:block">{session.user.name}</span>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-[#2a2a3f] px-3 py-1.5 text-sm text-[#8888aa] hover:border-[#3a3a55] hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main layout: two columns on desktop */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <span>{error}</span>
            <div className="flex items-center gap-3 ml-3 shrink-0">
              <button
                onClick={() => { setError(null); fetchTasks(); }}
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 text-xs"
              >
                Retry
              </button>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: Task Manager */}
          <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#2a2a3f] bg-[#12121a] p-4">
                <p className="text-xs font-medium text-[#8888aa] uppercase tracking-wide">Pending</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">{pendingCount}</p>
              </div>
              <div className="rounded-xl border border-[#2a2a3f] bg-[#12121a] p-4">
                <p className="text-xs font-medium text-[#8888aa] uppercase tracking-wide">Completed</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">{completedCount}</p>
              </div>
            </div>

            {/* Task form */}
            <div className="rounded-xl border border-[#2a2a3f] bg-[#12121a] p-4">
              {editingTask ? (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    <h2 className="text-sm font-medium text-[#c0c0d8]">Editing task</h2>
                  </div>
                  <TaskForm
                    initialValues={{ title: editingTask.title, description: editingTask.description ?? undefined }}
                    onSubmit={handleUpdate}
                    submitLabel="Save Changes"
                    onCancel={() => setEditingTask(null)}
                  />
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    <h2 className="text-sm font-medium text-[#c0c0d8]">New Task</h2>
                  </div>
                  <TaskForm onSubmit={handleCreate} />
                </>
              )}
            </div>

            {/* Task list */}
            <div className="rounded-xl border border-[#2a2a3f] bg-[#12121a] p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2a2a3f] border-t-violet-500" />
                </div>
              ) : (
                <TaskList tasks={tasks} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} />
              )}
            </div>
          </div>

          {/* RIGHT: AI Chat */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
