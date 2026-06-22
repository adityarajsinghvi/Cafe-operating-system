"use client";

import Link from "next/link";
import { ParchaWordmark } from "@/components/shared/parcha-logo";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  Clock,
  QrCode,
  ScrollText,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
  Search,
  Bell,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  DESIGN TOKENS                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
const C = {
  espresso: "#3d3929",
  espressoDeep: "#2a2720",
  terracotta: "#c96442",
  terracottaDeep: "#b05730",
  paper: "#faf9f5",
  paperMid: "#f3f1ea",
  ink: "#2c2b27",
  inkMuted: "#83827d",
  border: "#e2e0d8",
  gold: "#b05730",
};

const SERIF = `var(--font-calistoga), Georgia, serif`;

/* ─────────────────────────────────────────────────────────────────────────── */
/*  SPRING DOT CURSOR                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
function SpringCursor() {
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  // Dot — snappy, follows closely
  const dotX = useSpring(mx, { stiffness: 280, damping: 24, mass: 0.5 });
  const dotY = useSpring(my, { stiffness: 280, damping: 24, mass: 0.5 });
  // Ring — laggy, trails behind
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
      {/* Outer ring — slow, elastic */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: ringX,
          top: ringY,
          width: 36,
          height: 36,
          x: -18,
          y: -18,
          border: `1.5px solid rgba(201,100,66,0.4)`,
        }}
      />
      {/* Inner dot — fast */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: dotX,
          top: dotY,
          width: 10,
          height: 10,
          x: -5,
          y: -5,
          background: C.terracotta,
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  FADE-UP on SCROLL                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
function FadeUp({
  children,
  delay = 0,
  className = "",
  y = 36,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  3D TILT CARD                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function TiltCard({
  children,
  className = "",
  intensity = 8,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-intensity, intensity]);
  const smoothRX = useSpring(rotateX, { stiffness: 200, damping: 24 });
  const smoothRY = useSpring(rotateY, { stiffness: 200, damping: 24 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      x.set((e.clientX - rect.left) / rect.width - 0.5);
      y.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [x, y]
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX: smoothRX, rotateY: smoothRY, transformStyle: "preserve-3d", perspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ANIMATED COUNTER                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */
function Counter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 1600;
    const raf = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const val = Math.round(ease * target);
      setDisplay(val);
      if (t < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TORN PAPER SVG EDGE                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */
function TornEdge({ fill = C.espresso, bg = C.paper, flip = false }: { fill?: string; bg?: string; flip?: boolean }) {
  const path = "M0,0 L0,24 L20,6 L40,20 L60,5 L80,19 L100,4 L120,18 L140,5 L160,20 L180,5 L200,18 L220,4 L240,19 L260,5 L280,20 L300,4 L320,18 L340,5 L360,20 L380,5 L400,18 L420,4 L440,19 L460,5 L480,20 L500,4 L520,19 L540,5 L560,20 L580,4 L600,18 L620,5 L640,20 L660,4 L680,19 L700,5 L720,20 L740,5 L760,18 L780,4 L800,19 L820,5 L840,20 L860,4 L880,19 L900,5 L920,20 L940,4 L960,18 L980,5 L1000,20 L1020,4 L1040,19 L1060,5 L1080,20 L1100,4 L1120,18 L1140,5 L1160,20 L1180,5 L1200,18 L1200,0 Z";
  const path2 = "M0,24 L20,6 L40,20 L60,5 L80,19 L100,4 L120,18 L140,5 L160,20 L180,5 L200,18 L220,4 L240,19 L260,5 L280,20 L300,4 L320,18 L340,5 L360,20 L380,5 L400,18 L420,4 L440,19 L460,5 L480,20 L500,4 L520,19 L540,5 L560,20 L580,4 L600,18 L620,5 L640,20 L660,4 L680,19 L700,5 L720,20 L740,5 L760,18 L780,4 L800,19 L820,5 L840,20 L860,4 L880,19 L900,5 L920,20 L940,4 L960,18 L980,5 L1000,20 L1020,4 L1040,19 L1060,5 L1080,20 L1100,4 L1120,18 L1140,5 L1160,20 L1180,5 L1200,18 L1200,24 Z";
  return (
    <svg
      viewBox="0 0 1200 24"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: 24, marginTop: -1, transform: flip ? "scaleY(-1)" : undefined }}
    >
      <path d={path} style={{ fill }} />
      <path d={path2} fill={bg} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  PHONE FRAME — GUEST CHIT                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function GuestPhoneMock() {
  const [activeTab, setActiveTab] = useState<"discover"|"menu">("menu");
  return (
    <div
      className="relative w-[260px] overflow-hidden rounded-[32px] shadow-2xl shadow-black/40 ring-4 ring-black/10"
      style={{ background: C.paper }}
    >
      {/* Phone notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 h-5 w-20 rounded-b-2xl bg-black" />

      {/* Espresso header */}
      <div className="px-4 pb-4 pt-7" style={{ background: C.espresso }}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white shadow-lg" style={{ background: C.terracotta, fontFamily: SERIF }}>
            B
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: C.paper, fontFamily: SERIF }}>Brew & Co.</p>
            <p className="text-[10px]" style={{ color: "rgba(250,249,245,0.5)" }}>Koramangala, Bengaluru</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: "rgba(250,249,245,0.1)", color: "rgba(250,249,245,0.6)", border: "1px solid rgba(250,249,245,0.12)" }}>
            🍽️ 24 dishes · 6 categories
          </span>
        </div>
      </div>

      {/* Torn paper edge */}
      <svg viewBox="0 0 260 10" preserveAspectRatio="none" className="block w-full" style={{ height: 10, marginTop: -1 }}>
        <path d="M0,0 L0,10 L8,3 L16,8 L24,2 L32,8 L40,2 L48,8 L56,3 L64,8 L72,2 L80,8 L88,3 L96,8 L104,2 L112,8 L120,3 L128,8 L136,2 L144,8 L152,3 L160,8 L168,2 L176,8 L184,3 L192,8 L200,2 L208,8 L216,3 L224,8 L232,2 L240,8 L248,3 L256,8 L260,5 L260,0 Z" style={{ fill: C.espresso }} />
        <path d="M0,10 L8,3 L16,8 L24,2 L32,8 L40,2 L48,8 L56,3 L64,8 L72,2 L80,8 L88,3 L96,8 L104,2 L112,8 L120,3 L128,8 L136,2 L144,8 L152,3 L160,8 L168,2 L176,8 L184,3 L192,8 L200,2 L208,8 L216,3 L224,8 L232,2 L240,8 L248,3 L256,8 L260,5 L260,10 Z" fill={C.paper} />
      </svg>

      {/* Tab bar */}
      <div className="flex gap-1 px-3 pb-2 pt-1">
        {(["discover","menu"] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className="flex-1 rounded-lg py-1.5 text-[10px] font-bold capitalize transition-all"
            style={{ background: activeTab === tab ? C.espresso : "transparent", color: activeTab === tab ? C.paper : C.inkMuted }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content — menu items */}
      <div className="space-y-1.5 px-3 pb-4" style={{
        backgroundImage: "repeating-linear-gradient(transparent,transparent 23px,rgba(0,0,0,0.04) 23px,rgba(0,0,0,0.04) 24px)",
        backgroundPosition: "0 0",
      }}>
        {[
          { name: "Cappuccino", price: "₹180", tag: "🌿 Veg", popular: true },
          { name: "Cold Brew", price: "₹220", tag: "🌿 Veg", popular: false },
          { name: "Masala Chai", price: "₹80", tag: "🌿 Veg", popular: true },
          { name: "Croissant", price: "₹120", tag: "🌿 Veg", popular: false },
        ].map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
            className="flex items-center justify-between rounded-xl border bg-white px-2.5 py-2 shadow-sm"
            style={{ borderColor: C.border }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                {item.popular && (
                  <span className="rounded px-1 py-px text-[8px] font-bold" style={{ background: "#fdf0ec", color: C.terracotta }}>Popular</span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] font-bold" style={{ color: C.ink, fontFamily: SERIF }}>{item.name}</p>
              <p className="text-[10px] font-bold" style={{ color: C.terracotta }}>{item.price}</p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-sm text-sm font-bold" style={{ background: C.terracotta }}>
              +
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cart FAB */}
      <div className="mx-3 mb-4">
        <div className="flex items-center justify-between rounded-2xl px-3 py-2.5 shadow-md" style={{ background: C.espresso }}>
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" style={{ color: C.paper }} />
            <p className="text-[11px] font-bold" style={{ color: C.paper, fontFamily: SERIF }}>Your Parcha 📋</p>
          </div>
          <span className="rounded-lg px-2 py-0.5 text-[9px] font-black" style={{ background: C.terracotta, color: "#fff" }}>2 items</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TABLET FRAME — OWNER DASHBOARD                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function DashboardTabletMock() {
  return (
    <div
      className="w-[380px] overflow-hidden rounded-[20px] shadow-2xl shadow-black/35 ring-4 ring-black/10"
      style={{ background: "#f5f5f0" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#1a1a1a" }}>
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-[10px] font-medium text-white/40">parcha.app/dashboard</span>
      </div>

      {/* App layout */}
      <div className="flex">
        {/* Sidebar */}
        <div className="flex w-36 flex-col border-r px-3 py-4" style={{ background: "hsl(var(--card))", borderColor: C.border }}>
          <p className="mb-0.5 text-[8px] font-black uppercase tracking-widest" style={{ color: C.inkMuted }}>Parcha</p>
          <p className="mb-3 border-b pb-3 text-[11px] font-bold" style={{ color: C.ink, fontFamily: SERIF, borderColor: C.border }}>Brew & Co.</p>
          {["Live Orders", "Menu", "Customers", "Rewards", "History", "Settings"].map((item, i) => (
            <div key={item} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: i === 0 ? C.espresso : "transparent" }}>
              <span className="text-[10px] font-semibold" style={{ color: i === 0 ? C.paper : C.inkMuted }}>{item}</span>
              {i === 0 && <span className="ml-auto flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-black text-white" style={{ background: C.terracotta }}>3</span>}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-3">
          {/* Chit header */}
          <div className="mb-2.5 overflow-hidden rounded-lg border" style={{ borderColor: C.border }}>
            <div className="px-3 py-2" style={{ background: C.espresso }}>
              <p className="text-[11px] font-black" style={{ color: C.paper, fontFamily: SERIF }}>Live Orders 🧾</p>
              <p className="text-[8px]" style={{ color: "rgba(250,249,245,0.45)" }}>3 active · updates live</p>
            </div>
          </div>

          {/* Order columns */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { table: "Table 3", items: ["Cappuccino ×2", "Croissant ×1"], status: "PENDING", dot: "#d97706", bg: "#fffbeb", color: "#92400e", total: "₹480" },
              { table: "Table 7", items: ["Cold Brew ×1"], status: "READY", dot: "#16a34a", bg: "#f0fdf4", color: "#166534", total: "₹220" },
              { table: "Table 1", items: ["Masala Chai ×3"], status: "KITCHEN", dot: "#ea580c", bg: "#fff7ed", color: "#9a3412", total: "₹240" },
            ].map((o, i) => (
              <motion.div
                key={o.table}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`overflow-hidden rounded-lg border shadow-sm ${i === 2 ? "col-span-2" : ""}`}
                style={{ borderColor: C.border }}
              >
                <div className="flex items-center justify-between px-2.5 py-1.5" style={{ background: C.espresso }}>
                  <p className="text-[10px] font-bold" style={{ color: C.paper, fontFamily: SERIF }}>{o.table}</p>
                  <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8px] font-black" style={{ background: o.bg, color: o.color }}>
                    <span className="h-1 w-1 rounded-full" style={{ background: o.dot }} />
                    {o.status}
                  </span>
                </div>
                <div className="border-t border-dashed px-2.5 py-2" style={{ borderColor: C.border, backgroundImage: "repeating-linear-gradient(transparent,transparent 15px,rgba(0,0,0,0.03) 15px,rgba(0,0,0,0.03) 16px)" }}>
                  {o.items.map((item) => (
                    <p key={item} className="text-[9px]" style={{ color: C.ink, fontFamily: SERIF }}>{item}</p>
                  ))}
                  <div className="mt-1.5 flex items-center justify-between">
                    <p className="text-[10px] font-black" style={{ color: C.terracotta, fontFamily: SERIF }}>{o.total}</p>
                    <button className="rounded px-1.5 py-0.5 text-[8px] font-bold text-white" style={{ background: C.terracotta }}>
                      Advance →
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  LOYALTY MOCK                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function LoyaltyMock() {
  return (
    <div className="w-[280px] overflow-hidden rounded-3xl shadow-2xl shadow-black/30 ring-1 ring-black/10" style={{ background: C.paper }}>
      <div className="px-5 py-4" style={{ background: C.espresso }}>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(250,249,245,0.5)" }}>Your loyalty</p>
        <p className="mt-0.5 text-lg font-black" style={{ color: C.paper, fontFamily: SERIF }}>340 Points ⭐</p>
        <p className="text-[11px]" style={{ color: "rgba(250,249,245,0.55)" }}>160 more to earn a Free Coffee</p>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full" style={{ background: "rgba(250,249,245,0.12)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "68%" }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
            className="h-full rounded-full"
            style={{ background: C.terracotta }}
          />
        </div>
      </div>
      <svg viewBox="0 0 280 8" preserveAspectRatio="none" className="block w-full" style={{ height: 8, marginTop: -1 }}>
        <path d="M0,0 L0,8 L8,2 L16,6 L24,1 L32,6 L40,1 L48,6 L56,2 L64,6 L72,1 L80,6 L88,2 L96,6 L104,1 L112,6 L120,2 L128,6 L136,1 L144,6 L152,2 L160,6 L168,1 L176,6 L184,2 L192,6 L200,1 L208,6 L216,2 L224,6 L232,1 L240,6 L248,2 L256,6 L264,1 L272,6 L280,3 L280,0 Z" style={{ fill: C.espresso }} />
        <path d="M0,8 L8,2 L16,6 L24,1 L32,6 L40,1 L48,6 L56,2 L64,6 L72,1 L80,6 L88,2 L96,6 L104,1 L112,6 L120,2 L128,6 L136,1 L144,6 L152,2 L160,6 L168,1 L176,6 L184,2 L192,6 L200,1 L208,6 L216,2 L224,6 L232,1 L240,6 L248,2 L256,6 L264,1 L272,6 L280,3 L280,8 Z" fill={C.paper} />
      </svg>
      <div className="space-y-2 px-4 py-3" style={{ backgroundImage: "repeating-linear-gradient(transparent,transparent 23px,rgba(0,0,0,0.04) 23px,rgba(0,0,0,0.04) 24px)" }}>
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.inkMuted }}>Recent visits</p>
        {[
          { label: "Today · Table 4", pts: "+30 pts", time: "2:14 PM" },
          { label: "Yesterday · Table 2", pts: "+50 pts", time: "7:30 PM" },
          { label: "Mon · Table 7", pts: "+40 pts", time: "11:15 AM" },
        ].map((v) => (
          <div key={v.label} className="flex items-center justify-between rounded-lg border bg-white px-2.5 py-1.5" style={{ borderColor: C.border }}>
            <div>
              <p className="text-[10px] font-bold" style={{ color: C.ink, fontFamily: SERIF }}>{v.label}</p>
              <p className="text-[9px]" style={{ color: C.inkMuted }}>{v.time}</p>
            </div>
            <span className="rounded-sm px-1.5 py-0.5 text-[9px] font-black" style={{ background: "#fdf4ef", color: C.terracotta }}>{v.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CUSTOMERS MOCK                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function CustomersMock() {
  return (
    <div className="w-[320px] overflow-hidden rounded-2xl shadow-xl shadow-black/20 ring-1 ring-black/10" style={{ background: "hsl(var(--card))" }}>
      <div className="border-b border-dashed px-4 py-3" style={{ borderColor: C.border, background: C.espresso }}>
        <p className="text-[11px] font-black" style={{ color: C.paper, fontFamily: SERIF }}>Customers 👥</p>
        <div className="mt-2 grid grid-cols-3 divide-x divide-dashed" style={{ borderColor: "rgba(250,249,245,0.15)" }}>
          {[["124", "Total"], ["89", "Return"], ["₹48K", "Revenue"]].map(([v, l]) => (
            <div key={l} className="px-2 text-center">
              <p className="text-sm font-black" style={{ color: C.paper, fontFamily: SERIF }}>{v}</p>
              <p className="text-[8px]" style={{ color: "rgba(250,249,245,0.45)" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {[
          { name: "Priya Sharma", phone: "+91 98765 43210", pts: 340, fav: "Cappuccino", visits: 12 },
          { name: "Rahul Mehta", phone: "+91 87654 32109", pts: 180, fav: "Cold Brew", visits: 7 },
          { name: "Anjali Singh", phone: "+91 76543 21098", pts: 520, fav: "Masala Chai", visits: 18 },
        ].map((c) => (
          <div key={c.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-[11px] font-black" style={{ background: C.terracotta }}>
              {c.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold" style={{ color: C.ink, fontFamily: SERIF }}>{c.name}</p>
              <p className="text-[9px]" style={{ color: C.inkMuted }}>Fav: {c.fav} · {c.visits} visits</p>
            </div>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: "#fff8e6", color: "#92400e" }}>⭐ {c.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  STEP card                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function Step({ n, title, desc, delay }: { n: string; title: string; desc: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -24 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className="flex gap-4"
    >
      <div className="relative flex flex-col items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-lg" style={{ background: C.espresso, fontFamily: SERIF }}>
          {n}
        </div>
        {n !== "4" && <div className="mt-2 flex-1 w-px" style={{ background: `linear-gradient(${C.terracotta}, transparent)`, minHeight: 40 }} />}
      </div>
      <div className="pb-6 pt-1">
        <h3 className="mb-1 text-base font-bold tracking-tight" style={{ fontFamily: SERIF }}>{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  FEATURE CARD                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, delay }: { icon: React.ElementType; title: string; desc: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 cursor-default"
      style={{
        borderColor: hovered ? `${C.terracotta}40` : C.border,
        background: hovered ? `linear-gradient(135deg, ${C.paper} 0%, #fdf4ef 100%)` : "hsl(var(--card))",
        boxShadow: hovered ? `0 8px 32px rgba(201,100,66,0.12)` : "0 1px 3px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* Ruled paper lines on hover */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          backgroundImage: "repeating-linear-gradient(transparent,transparent 23px,rgba(0,0,0,0.03) 23px,rgba(0,0,0,0.03) 24px)",
        }}
      />
      <div className="relative">
        <motion.div
          animate={{ scale: hovered ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
          className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: hovered ? C.terracotta : `${C.terracotta}15` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: hovered ? "#fff" : C.terracotta }} />
        </motion.div>
        <h3 className="mb-1.5 text-[15px] font-bold tracking-tight" style={{ fontFamily: SERIF }}>{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  MAIN PAGE                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const heroRef = useRef<HTMLElement>(null);
  const scrollY = useMotionValue(0);

  useEffect(() => {
    const update = () => scrollY.set(window.scrollY);
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [scrollY]);

  const heroY = useTransform(scrollY, [0, 600], [0, -120]);

  return (
    <div className="overflow-x-hidden" style={{ background: C.paper }}>
      <SpringCursor />

      {/* ── Sticky nav ────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 lg:px-16"
        style={{
          background: "rgba(61,57,41,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(250,249,245,0.08)",
        }}
      >
        <ParchaWordmark variant="light" height={26} />
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
            className="rounded-xl px-4 py-2 text-sm font-bold text-white transition-all hover:-translate-y-px"
            style={{ background: C.terracotta }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        style={{ background: C.espresso, minHeight: "100dvh" }}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(250,249,245,1) 1px, transparent 1px), linear-gradient(90deg, rgba(250,249,245,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-center gap-16 px-6 pb-0 pt-32 md:flex-row md:items-center md:pt-28 lg:px-16">
          {/* Left — copy */}
          <motion.div className="flex-1 md:max-w-[52%]" style={{ y: heroY }}>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-semibold"
              style={{ borderColor: "rgba(250,249,245,0.15)", color: "rgba(250,249,245,0.7)", background: "rgba(250,249,245,0.07)" }}
            >
              <ScrollText className="h-3.5 w-3.5" />
              The digital order slip for Indian cafes
            </motion.div>

            {/* Headline — staggered words */}
            <div className="mb-6 overflow-hidden">
              {["The parcha", "never gets lost."].map((line, li) => (
                <div key={li} className="overflow-hidden">
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.08 + li * 0.15 }}
                  >
                    <span
                      className="block text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
                      style={{
                        color: li === 0 ? C.paper : C.terracotta,
                        fontFamily: SERIF,
                      }}
                    >
                      {line}
                    </span>
                  </motion.div>
                </div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.35 }}
              className="mb-8 max-w-md text-base leading-relaxed sm:text-lg"
              style={{ color: "rgba(250,249,245,0.6)" }}
            >
              AI-powered OS for modern Indian cafes. Upload your menu, go live in 2 minutes. Guests order on a beautiful digital chit. You run everything from one dashboard.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.45 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-base font-bold text-white shadow-xl transition-all hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: C.terracotta, boxShadow: `0 8px 32px ${C.terracotta}50` }}
              >
                Start free — 2 min setup
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold transition-all hover:-translate-y-0.5"
                style={{ color: "rgba(250,249,245,0.75)", background: "rgba(250,249,245,0.09)", border: "1px solid rgba(250,249,245,0.12)" }}
              >
                Owner dashboard →
              </Link>
            </motion.div>

            {/* Mini stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-10 flex flex-wrap gap-6"
            >
              {[
                { v: "2 min", l: "Setup time" },
                { v: "0₹", l: "To start" },
                { v: "UPI", l: "Payments" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-2xl font-black" style={{ color: C.paper, fontFamily: SERIF }}>{s.v}</p>
                  <p className="text-[11px] font-semibold" style={{ color: "rgba(250,249,245,0.4)" }}>{s.l}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — floating app mocks */}
          <div className="relative flex flex-1 items-end justify-center pb-0 md:justify-end">
            {/* Phone mock — guest */}
            <motion.div
              initial={{ opacity: 0, y: 48, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: -4 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10"
              style={{ transformOrigin: "bottom center" }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              >
                <TiltCard intensity={5}>
                  <GuestPhoneMock />
                </TiltCard>
              </motion.div>
            </motion.div>

            {/* Tablet mock — dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 64, rotate: 3 }}
              animate={{ opacity: 1, y: 0, rotate: 3 }}
              transition={{ duration: 0.85, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative -ml-12 mt-10"
            >
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
              >
                <TiltCard intensity={4}>
                  <DashboardTabletMock />
                </TiltCard>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Torn paper bottom */}
        <div className="mt-8">
          <TornEdge fill={C.espresso} bg={C.paper} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SOCIAL PROOF STRIP
      ══════════════════════════════════════════════════════════════════════ */}
      <FadeUp>
        <div className="border-b border-dashed px-4 py-5" style={{ borderColor: C.border, backgroundImage: "repeating-linear-gradient(transparent,transparent 23px,rgba(0,0,0,0.03) 23px,rgba(0,0,0,0.03) 24px)" }}>
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm" style={{ color: C.inkMuted }}>
            {[
              { emoji: "🏪", text: "Built for Indian cafes" },
              { emoji: "⚡", text: "Live in under 2 minutes" },
              { emoji: "🇮🇳", text: "UPI payments built-in" },
              { emoji: "🤖", text: "AI menu extraction" },
              { emoji: "⭐", text: "Loyalty points included" },
            ].map((item) => (
              <span key={item.text} className="flex items-center gap-2 font-medium">
                {item.emoji} {item.text}
              </span>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* ══════════════════════════════════════════════════════════════════════
          STATS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-20" style={{ background: C.espresso }}>
        <FadeUp className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl shadow-xl md:grid-cols-4" style={{ background: "rgba(250,249,245,0.1)" }}>
            {[
              { value: 2, suffix: " min", label: "Setup time", sub: "from photo to live" },
              { value: 100, suffix: "%", label: "Digital", sub: "no app install needed" },
              { value: 24, suffix: "/7", label: "Live orders", sub: "real-time kitchen board" },
              { value: 0, suffix: "₹", label: "To start", sub: "free to get going" },
            ].map((s, i) => (
              <div key={s.label} className="flex flex-col items-center px-6 py-8 text-center" style={{ background: "rgba(61,57,41,0.85)" }}>
                <p className="text-3xl font-black sm:text-4xl" style={{ color: C.paper, fontFamily: SERIF }}>
                  <Counter target={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-sm font-bold" style={{ color: C.terracotta }}>{s.label}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: "rgba(250,249,245,0.4)" }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </FadeUp>
        <div className="mt-0">
          <TornEdge fill={C.espresso} bg={C.paper} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          GUEST EXPERIENCE — with phone mock
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24" style={{ background: C.paper }}>
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left — large floating phone */}
            <FadeUp delay={0} className="flex justify-center lg:justify-start">
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                style={{ filter: "drop-shadow(0 32px 48px rgba(61,57,41,0.3))" }}
              >
                <TiltCard intensity={6}>
                  <GuestPhoneMock />
                </TiltCard>
              </motion.div>
            </FadeUp>

            {/* Right — copy */}
            <div className="space-y-6">
              <FadeUp delay={0.05}>
                <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: C.terracotta }}>Guest experience</p>
                <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl" style={{ fontFamily: SERIF }}>
                  Order from a<br />
                  <span style={{ color: C.terracotta }}>digital chit.</span>
                </h2>
              </FadeUp>

              <FadeUp delay={0.1}>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Guests scan a QR at the table and instantly get a beautiful digital menu — no app download, no login. Browse by category, search for items, see what&apos;s popular, and send their order straight to the kitchen.
                </p>
              </FadeUp>

              <FadeUp delay={0.15} className="space-y-3">
                {[
                  { icon: QrCode, text: "Scan QR → full menu in under 1 second" },
                  { icon: Search, text: "Smart search: 'spicy', 'cold coffee', 'veg'" },
                  { icon: ScrollText, text: "Order tracked on their personal parcha" },
                  { icon: Star, text: "Loyalty points earned automatically" },
                  { icon: Bell, text: "Call waiter, request water or bill — one tap" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${C.terracotta}15` }}>
                      <item.icon className="h-4 w-4" style={{ color: C.terracotta }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: C.ink }}>{item.text}</p>
                  </div>
                ))}
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          OWNER DASHBOARD — with tablet mock
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24" style={{ background: C.paperMid }}>
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left — copy */}
            <div className="space-y-6 lg:order-1">
              <FadeUp delay={0.05}>
                <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: C.terracotta }}>Owner dashboard</p>
                <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl" style={{ fontFamily: SERIF }}>
                  Every order as<br />
                  <span style={{ color: C.terracotta }}>a paper chit.</span>
                </h2>
              </FadeUp>

              <FadeUp delay={0.1}>
                <p className="text-base leading-relaxed text-muted-foreground">
                  The dashboard looks and feels like a physical parcha system. Each order arrives as a digital chit — with the table number, items, status stamp, and total. Advance it from pending → kitchen → ready → served with one tap.
                </p>
              </FadeUp>

              <FadeUp delay={0.15} className="space-y-3">
                {[
                  { icon: Zap, text: "Real-time order board — no refresh needed" },
                  { icon: Clock, text: "Advance orders through kitchen in one tap" },
                  { icon: TrendingUp, text: "Revenue, best-sellers, and customer insights" },
                  { icon: Star, text: "Manage loyalty rewards and redemptions" },
                  { icon: Camera, text: "Upload menu via photo — AI structures it" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${C.terracotta}15` }}>
                      <item.icon className="h-4 w-4" style={{ color: C.terracotta }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: C.ink }}>{item.text}</p>
                  </div>
                ))}
              </FadeUp>
            </div>

            {/* Right — dashboard mock */}
            <FadeUp delay={0.1} className="flex justify-center lg:order-2 lg:justify-end">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.3 }}
                style={{ filter: "drop-shadow(0 24px 40px rgba(61,57,41,0.25))" }}
              >
                <TiltCard intensity={4}>
                  <DashboardTabletMock />
                </TiltCard>
              </motion.div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24" style={{ background: C.paper }}>
        <div className="mx-auto max-w-5xl">
          <FadeUp className="mb-14">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: C.terracotta }}>How it works</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl" style={{ fontFamily: SERIF }}>
              Printed menu to<br /><span style={{ color: C.terracotta }}>live in 4 steps.</span>
            </h2>
          </FadeUp>

          <div className="grid gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <Step n="1" title="Upload your menu" delay={0.0} desc="Snap a photo of your printed menu, upload a PDF, or type it in. Our AI reads it and structures every item, price, and category instantly." />
              <Step n="2" title="Review & publish" delay={0.05} desc="Check AI-extracted items in a clean editor. Adjust anything, then hit Publish. Your menu is live at a QR code URL." />
              <Step n="3" title="Guests scan & order" delay={0.1} desc="Guests scan the QR at their table, browse the digital chit, and send orders straight to your kitchen board — no app install." />
              <Step n="4" title="Track & grow" delay={0.15} desc="Watch orders land in real time. See best-sellers, customer loyalty, and revenue — all in one place." />
            </div>

            <FadeUp delay={0.1} className="flex flex-col items-center justify-center gap-6">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                style={{ filter: "drop-shadow(0 20px 32px rgba(61,57,41,0.22))" }}
              >
                <TiltCard intensity={5}>
                  <LoyaltyMock />
                </TiltCard>
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ fontFamily: SERIF, color: C.ink }}>Guest loyalty view</p>
                <p className="text-xs mt-0.5" style={{ color: C.inkMuted }}>Points earned automatically on every order</p>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CUSTOMERS & INSIGHTS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24" style={{ background: C.espresso }}>
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <FadeUp>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: C.terracotta }}>Customer intelligence</p>
              <h2 className="mb-4 text-3xl font-black tracking-tight sm:text-4xl" style={{ fontFamily: SERIF, color: C.paper }}>
                Know every regular<br />
                <span style={{ color: C.terracotta }}>by name.</span>
              </h2>
              <p className="mb-6 leading-relaxed" style={{ color: "rgba(250,249,245,0.6)" }}>
                Every guest who shares their number builds a profile. You see their favourite items, total visits, spending history, and loyalty points — a real CRM built into your cafe OS.
              </p>
              <div className="space-y-2.5">
                {[
                  "Returning customers tracked automatically",
                  "See favourite items per customer",
                  "Total revenue and visit count per guest",
                  "Export customer data anytime",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0" style={{ color: C.terracotta }} />
                    <p className="text-sm" style={{ color: "rgba(250,249,245,0.75)" }}>{item}</p>
                  </div>
                ))}
              </div>
            </FadeUp>

            <FadeUp delay={0.1} className="flex justify-center lg:justify-end">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                style={{ filter: "drop-shadow(0 20px 36px rgba(0,0,0,0.4))" }}
              >
                <TiltCard intensity={4}>
                  <CustomersMock />
                </TiltCard>
              </motion.div>
            </FadeUp>
          </div>
        </div>
        <div className="mt-16">
          <TornEdge fill={C.espresso} bg={C.paper} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24" style={{ background: C.paper }}>
        <div className="mx-auto max-w-5xl">
          <FadeUp className="mb-12">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: C.terracotta }}>Everything included</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl" style={{ fontFamily: SERIF }}>
              The complete cafe OS.
            </h2>
            <p className="mt-3 text-muted-foreground">No extra apps. No extra fees. Just one tool that does it all.</p>
          </FadeUp>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Camera,      title: "AI menu extraction",  desc: "Snap your printed menu. AI extracts every item, price, and category in seconds.", delay: 0 },
              { icon: Zap,         title: "Live order board",    desc: "Orders appear the moment guests send them. One tap to advance through the kitchen.", delay: 0.05 },
              { icon: QrCode,      title: "Instant QR menus",   desc: "Generate a table QR in one click. Guests scan, browse, and order — no app needed.", delay: 0.1 },
              { icon: Star,        title: "Built-in loyalty",   desc: "Guests earn points automatically. You set the reward. They come back for more.", delay: 0.15 },
              { icon: TrendingUp,  title: "Customer CRM",       desc: "See who your regulars are, what they love, and how much they spend.", delay: 0.2 },
              { icon: Clock,       title: "Table service calls", desc: "Guests request waiter, water, or bill from the same screen. No shouting needed.", delay: 0.25 },
            ].map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden px-4 py-24"
        style={{ background: C.espresso }}
      >
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle, ${C.paper} 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Torn top edge */}
        <div className="absolute top-0 left-0 w-full" style={{ transform: "scaleY(-1)" }}>
          <TornEdge fill={C.espresso} bg={C.paper} />
        </div>

        <FadeUp className="relative mx-auto max-w-2xl pt-6 text-center">
          <motion.div
            animate={{ rotate: [0, 5, -5, 3, 0], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="mx-auto mb-6 inline-block text-5xl"
          >
            📋
          </motion.div>

          <h2
            className="mb-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl"
            style={{ color: C.paper, fontFamily: SERIF }}
          >
            Start your first<br />
            <span style={{ color: C.terracotta }}>parcha today.</span>
          </h2>
          <p className="mb-8 text-lg" style={{ color: "rgba(250,249,245,0.6)" }}>
            Free to start. No credit card. Your menu live in under 2 minutes.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
              style={{ background: C.terracotta, boxShadow: `0 8px 32px ${C.terracotta}50` }}
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold transition-all hover:-translate-y-0.5"
              style={{ color: "rgba(250,249,245,0.7)", background: "rgba(250,249,245,0.09)", border: "1px solid rgba(250,249,245,0.14)" }}
            >
              Sign in to dashboard
            </Link>
          </div>

          <p className="mt-8 text-sm" style={{ color: "rgba(250,249,245,0.3)" }}>
            Made with ❤️ for Indian cafe owners
          </p>
        </FadeUp>
      </section>
    </div>
  );
}
