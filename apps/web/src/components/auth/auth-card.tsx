"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export interface AuthCardProps {
  className?: string;
}

/**
 * Centered auth card — institutional / underwriting-tool aesthetic.
 *
 * Mock authentication only (v1): any well-formed email + 4+ char password
 * resolves; the user's tier is inferred from the email so demos can flip
 * between the four tiers (free / pro / premium / institutional) without
 * needing seeded accounts.
 *
 * Redirect target: `?next=` query param if present, else `/dashboard`.
 *
 * Real auth (Supabase / Clerk) lives behind the same `useAuth().signIn`
 * surface — only the store implementation changes when we wire it.
 */
export function AuthCard({ className }: AuthCardProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Authenticated home is the institutional settings shell — credentials
  // and underwriting preferences live here as the default landing.
  const next = params?.get("next") || "/settings/profile";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Sign-in failed.");
      return;
    }
    router.push(next);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-8 shadow-[0_20px_40px_rgba(0,51,30,0.06)]",
        className,
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"
          >
            Email
          </label>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <Mail size={16} />
            </span>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@firm.com"
              className={cn(
                "w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800",
                "placeholder:text-slate-400",
                "focus:border-forest-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-forest-900",
              )}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"
          >
            Password
          </label>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <Lock size={16} />
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={cn(
                "w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-800",
                "placeholder:text-slate-400",
                "focus:border-forest-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-forest-900",
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-forest-900"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <label className="flex cursor-pointer items-center gap-2 group">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-forest-900 focus:ring-forest-900/30"
          />
          <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
            Remember me on this device
          </span>
        </label>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "w-full rounded-lg bg-forest-900 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-md transition-all",
            "hover:brightness-110 active:scale-[0.98]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {submitting ? "Authenticating…" : "Access Platform"}
        </button>
      </form>

      {/* Secondary actions */}
      <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs">
        <p className="text-slate-500">
          ¿No tienes cuenta?{" "}
          <Link
            href="/login?next=/dashboard"
            className="font-bold text-forest-900 underline decoration-emerald-300 decoration-2 underline-offset-4 hover:decoration-forest-900"
          >
            Regístrate
          </Link>
        </p>
        <Link
          href="/login?reset=true"
          className="text-slate-400 transition-colors hover:text-forest-900"
        >
          ¿Has olvidado la contraseña? Restablécela
        </Link>
      </div>
    </div>
  );
}
