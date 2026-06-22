import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ParchaWordmark } from "@/components/shared/parcha-logo";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 lg:px-16"
        style={{
          background: "rgba(61,57,41,0.88)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(250,249,245,0.08)",
        }}
      >
        <Link href="/" className="flex flex-col leading-none">
          <ParchaWordmark variant="light" height={26} />
          <span
            className="mt-0.5 text-[10px] italic"
            style={{ color: "rgba(250,249,245,0.45)", fontFamily: "Georgia, serif" }}
          >
            The memory your cafe was missing
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: "rgba(250,249,245,0.7)" }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all hover:-translate-y-px"
            style={{ background: "#c96442", boxShadow: "0 4px 16px rgba(201,100,66,0.4)" }}
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
