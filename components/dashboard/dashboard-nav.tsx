import Link from "next/link";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { signOutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";

export const dashboardNavItems = [
  { label: "Dashboard", href: "" },
  { label: "Analytics", href: "/analytics" },
  { label: "Menu", href: "/menu" },
  { label: "Orders", href: "/orders", flag: "ordering" as const },
  { label: "History", href: "/history" },
  { label: "Rewards", href: "/rewards", flag: "rewards" as const },
  { label: "Customers", href: "/customers" },
  { label: "Settings", href: "/settings" },
] as const;

function NavLink({
  href,
  children,
  mode,
  onNavigate,
}: {
  href: string;
  children: ReactNode;
  mode: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const className =
    "rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent active:bg-accent";

  if (mode === "mobile") {
    return (
      <SheetClose asChild>
        <Link href={href} onClick={onNavigate} className={className}>
          {children}
        </Link>
      </SheetClose>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function DashboardNav({
  restaurantId,
  restaurantName,
  mode = "desktop",
  onNavigate,
  orderingEnabled = true,
  rewardsEnabled = true,
}: {
  restaurantId: string;
  restaurantName: string;
  mode?: "desktop" | "mobile";
  onNavigate?: () => void;
  orderingEnabled?: boolean;
  rewardsEnabled?: boolean;
}) {
  const basePath = `/dashboard/${restaurantId}`;
  const visibleNavItems = dashboardNavItems.filter((item) => {
    if ("flag" in item && item.flag === "ordering") return orderingEnabled;
    if ("flag" in item && item.flag === "rewards") return rewardsEnabled;
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Parcha wordmark */}
      <div className="mb-6">
        <p
          className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground mb-1"
        >
          Parcha
        </p>
        <h2
          className="truncate text-lg font-bold tracking-tight"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {restaurantName}
        </h2>
        <div className="mt-3 border-t border-dashed border-border" />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {visibleNavItems.map((item) => {
          const href = `${basePath}${item.href}`;

          if ("disabled" in item && item.disabled) {
            return (
              <span
                key={item.label}
                className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground/60"
              >
                {item.label}
                <span className="ml-2 text-xs">Soon</span>
              </span>
            );
          }

          return (
            <NavLink
              key={item.label}
              href={href}
              mode={mode}
              onNavigate={onNavigate}
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <ThemeToggle />
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm" className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
