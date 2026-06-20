import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;

  const errorMessage =
    error === "auth_callback_failed"
      ? "Email link is invalid or has expired. Sign in with your password instead."
      : undefined;

  return <LoginForm redirectTo={redirect} initialError={errorMessage} />;
}
