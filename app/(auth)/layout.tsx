"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

import { ParchaWordmark } from "@/components/shared/parcha-logo";

const C = {
  espresso: "#3d3929",
  terracotta: "#c96442",
  paper: "#faf9f5",
  border: "#dedad2",
  inkMuted: "rgba(250,249,245,0.45)",
};

function SpringCursor() {
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const dotX = useSpring(mx, { stiffness: 280, damping: 24, mass: 0.5 });
  const dotY = useSpring(my, { stiffness: 280, damping: 24, mass: 0.5 });
  const ringX = useSpring(mx, { stiffness: 80, damping: 20, mass: 0.8 });
  const ringY = useSpring(my, { stiffness: 80, damping: 20, mass: 0.8 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { mx.set(e.clientX); my.set(e.clientY); };
    const onEnter = () => setVisible(true);
    const onLeave = () => setVisible(false);
    window.addEventListener("mousemove", onMove);
    document.body.addEventListener("mouseenter", onEnter);
    document.body.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.body.removeEventListener("mouseenter", onEnter);
      document.body.removeEventListener("mouseleave", onLeave);
    };
  }, [mx, my]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.25s ease" }}
      aria-hidden
    >
      <motion.div
        className="absolute rounded-full"
        style={{ left: ringX, top: ringY, width: 36, height: 36, x: -18, y: -18, border: "1.5px solid rgba(201,100,66,0.4)" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ left: dotX, top: dotY, width: 10, height: 10, x: -5, y: -5, background: C.terracotta }}
      />
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 py-10"
      style={{ background: C.espresso }}
    >
      <SpringCursor />

      {/* Subtle dot-grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle, ${C.paper} 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-8 flex flex-col items-center gap-1.5"
      >
        <Link href="/" className="group">
          <ParchaWordmark variant="light" height={32} />
        </Link>
        <p className="text-[11px] italic" style={{ color: C.inkMuted, fontFamily: "Georgia, serif" }}>
          The memory your cafe was missing
        </p>
      </motion.div>

      {/* Card slot */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        className="relative w-full max-w-md"
      >
        {children}
      </motion.div>

      {/* Bottom link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="relative mt-8 text-[12px]"
        style={{ color: C.inkMuted }}
      >
        © 2025 Parcha ·{" "}
        <Link href="/" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
          Back to home
        </Link>
      </motion.p>
    </div>
  );
}
