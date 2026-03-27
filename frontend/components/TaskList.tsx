"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import TaskCard from "./TaskCard";

type Filter = "all" | "pending" | "completed";

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskList({ tasks, onToggle, onEdit, onDelete }: TaskListProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const filteredTasks = tasks.filter((t) => {
    if (filter === "pending") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const tabs: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Completed", value: "completed" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-[#2a2a3f] pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === tab.value
                ? "border-violet-500 text-violet-400"
                : "border-transparent text-[#8888aa] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {filteredTasks.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1a28]">
            <svg className="h-6 w-6 text-[#4a4a6a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-[#4a4a6a]">
            {filter === "all" ? "No tasks yet. Create your first task!" : `No ${filter} tasks.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
