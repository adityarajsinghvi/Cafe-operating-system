"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { signupAction, type AuthActionState } from "@/lib/actions/auth";

const SERIF = `var(--font-calistoga), Georgia, serif`;
const C = {
  espresso: "#3d3929",
  terracotta: "#c96442",
  paper: "#faf9f5",
  border: "#dedad2",
  ink: "#2c2b27",
  inkMuted: "#83827d",
};

const initialState: AuthActionState = {};

function ChitInput({
  id,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
  label,
}: {
  id: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  label: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPw ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[11px] font-black uppercase tracking-[0.15em]"
        style={{ color: C.inkMuted }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="w-full rounded-xl border bg-white px-3.5 py-3 text-sm font-medium outline-none ring-0 transition-all placeholder:text-[#c8c6be] focus:border-[#c96442] focus:ring-2 focus:ring-[#c96442]/20"
          style={{ borderColor: C.border, color: C.ink }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: C.inkMuted }}
            tabIndex={-1}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState);

  return (
    <div className="overflow-hidden rounded-3xl shadow-2xl shadow-black/40" style={{ background: C.paper }}>
      {/* Espresso header */}
      <div className="px-7 pb-5 pt-7" style={{ background: C.espresso }}>
        <p
          className="text-[11px] font-black uppercase tracking-[0.2em]"
          style={{ color: "rgba(250,249,245,0.4)" }}
        >
          Parcha · New account
        </p>
        <h1
          className="mt-1 text-3xl font-black tracking-tight"
          style={{ color: C.paper, fontFamily: SERIF }}
        >
          Start your parcha 📋
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(250,249,245,0.5)" }}>
          Menu live in under 2 minutes. Free to start.
        </p>
      </div>

      {/* Torn paper edge */}
      <svg viewBox="0 0 448 12" preserveAspectRatio="none" className="block w-full" style={{ height: 12, marginTop: -1 }}>
        <path d="M0,0 L0,12 L10,4 L20,10 L30,3 L40,9 L50,2 L60,9 L70,3 L80,9 L90,3 L100,9 L110,3 L120,9 L130,3 L140,9 L150,3 L160,9 L170,3 L180,9 L190,3 L200,9 L210,3 L220,9 L230,3 L240,9 L250,3 L260,9 L270,3 L280,9 L290,3 L300,9 L310,3 L320,9 L330,3 L340,9 L350,3 L360,9 L370,3 L380,9 L390,3 L400,9 L410,3 L420,9 L430,3 L440,9 L448,5 L448,0 Z" style={{ fill: C.espresso }} />
        <path d="M0,12 L10,4 L20,10 L30,3 L40,9 L50,2 L60,9 L70,3 L80,9 L90,3 L100,9 L110,3 L120,9 L130,3 L140,9 L150,3 L160,9 L170,3 L180,9 L190,3 L200,9 L210,3 L220,9 L230,3 L240,9 L250,3 L260,9 L270,3 L280,9 L290,3 L300,9 L310,3 L320,9 L330,3 L340,9 L350,3 L360,9 L370,3 L380,9 L390,3 L400,9 L410,3 L420,9 L430,3 L440,9 L448,5 L448,12 Z" fill={C.paper} />
      </svg>

      {/* Form body — ruled paper */}
      <div
        className="px-7 pb-7 pt-5"
        style={{
          backgroundImage: "repeating-linear-gradient(transparent,transparent 35px,rgba(0,0,0,0.04) 35px,rgba(0,0,0,0.04) 36px)",
          backgroundPosition: "0 16px",
        }}
      >
        {state.success ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12" style={{ color: C.terracotta }} />
            <div>
              <p className="text-lg font-black" style={{ fontFamily: SERIF, color: C.ink }}>
                Check your inbox 📬
              </p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: C.inkMuted }}>
                {state.success}
              </p>
            </div>
            <Link
              href="/login"
              className="mt-2 rounded-2xl px-6 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5"
              style={{ background: C.terracotta }}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <ChitInput id="fullName" name="fullName" label="Full name" placeholder="Aditya Singh" autoComplete="name" required />
            <ChitInput id="email" name="email" type="email" label="Email address" placeholder="you@cafe.com" autoComplete="email" required />
            <ChitInput id="password" name="password" type="password" label="Password" autoComplete="new-password" required />
            <ChitInput id="confirmPassword" name="confirmPassword" type="password" label="Confirm password" autoComplete="new-password" required />

            {state.error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-2xl px-5 py-3.5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: isPending ? C.inkMuted : C.terracotta, boxShadow: `0 6px 24px ${C.terracotta}40` }}
              >
                {isPending ? "Creating account…" : "Create account →"}
              </button>
            </div>
          </form>
        )}

        {!state.success && (
          <div className="mt-5 border-t border-dashed pt-5" style={{ borderColor: C.border }}>
            <p className="text-center text-sm" style={{ color: C.inkMuted }}>
              Already have an account?{" "}
              <Link href="/login" className="font-bold transition-colors hover:underline" style={{ color: C.espresso }}>
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
