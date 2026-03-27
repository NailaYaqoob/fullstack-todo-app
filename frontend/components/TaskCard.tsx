"use client";

import type { Task } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({ task, onToggle, onEdit, onDelete }: TaskCardProps) {
  const createdDate = new Date(task.created_at).toLocaleDateString();

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${
        task.completed
          ? "border-[#2a2a3f] bg-[#12121a] opacity-60"
          : "border-[#2a2a3f] bg-[#1a1a28] hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5"
      }`}
    >
      <button
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? "Mark as pending" : "Mark as completed"}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
          task.completed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-[#3a3a55] bg-transparent hover:border-violet-500"
        }`}
      >
        {task.completed && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-medium leading-snug ${task.completed ? "text-[#4a4a6a] line-through" : "text-white"}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="mt-1 text-sm text-[#8888aa] break-words">{task.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            task.completed
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          }`}>
            {task.completed ? "✓ Completed" : "● Pending"}
          </span>
          <span className="text-xs text-[#4a4a6a]">{createdDate}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button onClick={() => onEdit(task)} title="Edit task"
          className="rounded-lg p-1.5 text-[#4a4a6a] hover:bg-[#2a2a3f] hover:text-white transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onDelete(task.id)} title="Delete task"
          className="rounded-lg p-1.5 text-[#4a4a6a] hover:bg-red-500/10 hover:text-red-400 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
