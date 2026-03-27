"use client";

import { useState, useEffect } from "react";
import type { TaskCreate } from "@/lib/types";

interface TaskFormProps {
  onSubmit: (data: TaskCreate) => Promise<void>;
  initialValues?: { title: string; description?: string };
  submitLabel?: string;
  onCancel?: () => void;
}

export default function TaskForm({
  onSubmit,
  initialValues,
  submitLabel = "Add Task",
  onCancel,
}: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync initialValues when editing a different task
  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setDescription(initialValues?.description ?? "");
    setError(null);
  }, [initialValues?.title, initialValues?.description]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title must contain at least one non-whitespace character.");
      return;
    }
    if (trimmedTitle.length > 200) {
      setError("Title must be 200 characters or fewer.");
      return;
    }
    if (description.length > 1000) {
      setError("Description must be 1000 characters or fewer.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        title: trimmedTitle,
        description: description || undefined,
      });
      // Reset on success (only for create mode — edit mode unmounts the form)
      if (!initialValues) {
        setTitle("");
        setDescription("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}
      <div>
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={loading}
          className="block w-full rounded-lg border border-[#2a2a3f] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4a4a6a] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors disabled:opacity-50"
        />
      </div>
      <div>
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          disabled={loading}
          className="block w-full rounded-lg border border-[#2a2a3f] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4a4a6a] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors disabled:opacity-50 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-[#2a2a3f] px-4 py-2 text-sm font-medium text-[#8888aa] hover:border-[#3a3a55] hover:text-white disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
