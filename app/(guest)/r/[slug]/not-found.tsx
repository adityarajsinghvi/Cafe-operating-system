import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function GuestNotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Parcha
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Restaurant not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This menu may not be published yet, or the link might be incorrect.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
