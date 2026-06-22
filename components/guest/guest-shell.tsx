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
    <div
      className="guest-app relative min-h-[100dvh] overflow-x-hidden"
      style={{
        // Enough room for bottom nav (≈72px) + service bar (≈80px) + safe area
        paddingBottom: "calc(160px + env(safe-area-inset-bottom))",
      }}
    >
      {children}
    </div>
  );
}
