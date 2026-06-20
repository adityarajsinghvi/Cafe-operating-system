import type { ReactNode } from "react";

export function GuestShell({
  slug,
  children,
  primaryColor,
}: {
  slug: string;
  children: ReactNode;
  primaryColor?: string;
}) {
  return (
    <div className="guest-app relative min-h-[100dvh] overflow-x-hidden pb-40">
      {children}
    </div>
  );
}
