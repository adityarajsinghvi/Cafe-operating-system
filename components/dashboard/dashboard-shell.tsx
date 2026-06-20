"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function DashboardShell({
  restaurantId,
  restaurantName,
  children,
}: {
  restaurantId: string;
  restaurantName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 rounded-xl"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-6 pt-12">
              <DashboardNav
                restaurantId={restaurantId}
                restaurantName={restaurantName}
                mode="mobile"
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              {restaurantName}
            </p>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>

        <ThemeToggle />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border p-6 md:flex md:flex-col"
        style={{ background: "hsl(var(--card))" }}>
        <DashboardNav
          restaurantId={restaurantId}
          restaurantName={restaurantName}
        />
      </aside>

      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
