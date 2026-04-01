"use client";

import { useState, useRef, useEffect, useCallback } from "react";

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
import { chatApi } from "@/lib/api";

export const TASKS_CHANGED_EVENT = "chatkit:tasks-changed";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  { label: "Show my tasks", prompt: "List all my tasks" },
  { label: "Pending tasks", prompt: "Show my pending tasks" },
  { label: "Add a task", prompt: "Create a task called " },
];

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceSupported = typeof window !== "undefined" &&
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  // Load history on mount
  useEffect(() => {
    chatApi.history().then((h) => {
      if (h.messages.length > 0) {
        setMessages(h.messages.map((m) => ({ role: m.role, content: m.content })));
        setConversationId(h.conversation_id);
      }
    }).catch(() => {/* silently ignore history load failure */});
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  const send = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || isPending) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setIsPending(true);

    try {
      const res = await chatApi.send({
        message: msg,
        conversation_id: conversationId ?? undefined,
      });
      setConversationId(res.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      // Tell the task list to refresh (AI may have created/modified tasks)
      window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      // Remove the optimistic user message on failure
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsPending(false);
      inputRef.current?.focus();
    }
  }, [isPending, conversationId]);

  function toggleVoice() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setInput(transcript);
    };

    rec.onerror = () => setIsListening(false);
    rec.onend = () => {
      setIsListening(false);
      inputRef.current?.focus();
    };

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const isEmpty = messages.length === 0;
  const charCount = input.length;
  const overLimit = charCount > 2000;

  return (
    <div className="rounded-xl border border-[#2a2a3f] bg-[#12121a] overflow-hidden flex flex-col" style={{ height: 620 }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 border-b border-[#2a2a3f] px-4 py-3 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 border border-violet-500/30">
          <svg className="h-3.5 w-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">AI Assistant</h2>
          <p className="text-xs text-[#8888aa]">Manages your tasks via chat</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-[#8888aa]">Online</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/10 border border-violet-500/20">
              <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.414 2.798H4.213c-1.444 0-2.414-1.798-1.414-2.798L4 15.3" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">What can I help with?</p>
              <p className="text-xs text-[#8888aa] mt-1">I can create, list, update and delete your tasks</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTER_PROMPTS.map((sp) => (
                <button
                  key={sp.label}
                  onClick={() => {
                    if (sp.prompt.endsWith(" ")) {
                      setInput(sp.prompt);
                      inputRef.current?.focus();
                    } else {
                      send(sp.prompt);
                    }
                  }}
                  className="rounded-full border border-[#2a2a3f] bg-[#1a1a28] px-3 py-1.5 text-xs text-[#c0c0d8] hover:border-violet-500/40 hover:text-white transition-colors"
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/20 border border-violet-500/30 mr-2 mt-0.5">
                <svg className="h-3 w-3 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm-1 5h2v2h2v2h-2v2h-2v-2H9v-2h2V9z"/>
                </svg>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-violet-600 text-white rounded-tr-sm"
                  : "bg-[#1a1a28] border border-[#2a2a3f] text-[#e2e2f0] rounded-tl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isPending && (
          <div className="flex justify-start">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/20 border border-violet-500/30 mr-2 mt-0.5">
              <svg className="h-3 w-3 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm-1 5h2v2h2v2h-2v2h-2v-2H9v-2h2V9z"/>
              </svg>
            </div>
            <div className="bg-[#1a1a28] border border-[#2a2a3f] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4a4a6a] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-[#4a4a6a] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-[#4a4a6a] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 flex items-center justify-between shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:text-red-300">✕</button>
        </div>
      )}

      {/* ── Composer ── */}
      <div className="border-t border-[#2a2a3f] px-3 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AI assistant… (Enter to send)"
              rows={1}
              disabled={isPending}
              className="block w-full rounded-xl border border-[#2a2a3f] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4a4a6a] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50 transition-colors resize-none"
              style={{ minHeight: 42, maxHeight: 120 }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            {charCount > 1800 && (
              <span className={`absolute bottom-2 right-2 text-xs ${overLimit ? "text-red-400" : "text-[#4a4a6a]"}`}>
                {charCount}/2000
              </span>
            )}
          </div>
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              disabled={isPending}
              title={isListening ? "Stop recording" : "Voice input"}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                isListening
                  ? "border-red-500/50 bg-red-600/20 text-red-400 animate-pulse"
                  : "border-[#2a2a3f] bg-[#1a1a28] text-[#8888aa] hover:border-violet-500/40 hover:text-violet-400"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </button>
          )}
          <button
            onClick={() => send(input)}
            disabled={isPending || !input.trim() || overLimit}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-[#4a4a6a]">Shift+Enter for new line</p>
      </div>
    </div>
  );
}
