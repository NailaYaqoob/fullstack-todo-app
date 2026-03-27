"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        setError(result.error.message ?? "Sign up failed");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="w-full max-w-md rounded-2xl border border-[#2a2a3f] bg-[#12121a] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="mt-1 text-sm text-[#8888aa]">Start managing your tasks with AI</p>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#c0c0d8] mb-1.5">Name</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="block w-full rounded-lg border border-[#2a2a3f] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4a4a6a] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#c0c0d8] mb-1.5">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="block w-full rounded-lg border border-[#2a2a3f] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4a4a6a] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#c0c0d8] mb-1.5">Password</label>
            <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="block w-full rounded-lg border border-[#2a2a3f] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4a4a6a] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors mt-2">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#8888aa]">
          Already have an account?{" "}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
