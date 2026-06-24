import Link from "next/link";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { signOutAction } from "@/lib/actions/auth";
import type { RestaurantFeatures } from "@/lib/features";
import { ParchaWordmark } from "@/components/shared/parcha-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";

// flag matches a key on RestaurantFeatures; absence means always visible
const dashboardNavItems: Array<{
  label: string;
  href: string;
  flag?: keyof RestaurantFeatures;
  icon?: React.ReactNode;
}> = [
  { label: "Dashboard", href: "" },
  { label: "Analytics",  href: "/analytics",  flag: "fullAnalytics" },
  { label: "Menu",       href: "/menu" },
  { label: "Orders",     href: "/orders",     flag: "ordering" },
  { label: "History",    href: "/history",    flag: "bills" },
  { label: "Rewards",    href: "/rewards",    flag: "loyalty" },
  { label: "Customers",  href: "/customers" },
  { label: "Settings",   href: "/settings" },
  { label: "Billing",    href: "/billing" },
];

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
  features,
}: {
  restaurantId: string;
  restaurantName: string;
  mode?: "desktop" | "mobile";
  onNavigate?: () => void;
  features: RestaurantFeatures;
}) {
  const basePath = `/dashboard/${restaurantId}`;
  const visibleNavItems = dashboardNavItems.filter((item) =>
    item.flag ? Boolean(features[item.flag]) : true,
  );

  return (
    <div className="flex h-full flex-col">
      {/* Parcha logo */}
      <div className="mb-6">
        <ParchaWordmark variant="dark" height={24} className="mb-2" />
        <h2
          className="truncate text-sm font-semibold tracking-tight text-muted-foreground"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {restaurantName}
        </h2>
        <div className="mt-3 border-t border-dashed border-border" />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.label}
            href={`${basePath}${item.href}`}
            mode={mode}
            onNavigate={onNavigate}
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
          </NavLink>
        ))}
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
