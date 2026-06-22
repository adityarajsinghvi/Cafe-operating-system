"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Award,
  Check,
  Edit3,
  Gift,
  Loader2,
  Phone,
  Repeat2,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface RewardsConfig {
  enabled: boolean;
  pointsPerVisit: number;
  redemptionThreshold: number;
  rewardTitle: string;
  rewardDescription: string | null;
}

interface RewardsStats {
  totalMembers: number;
  totalPointsIssued: number;
  avgPoints: number;
  readyToRedeem: number;
  closeToRedeem: number;
  totalRedemptions: number;
}

interface LeaderboardEntry {
  id: string;
  name: string | null;
  phone: string;
  points: number;
  visits: number;
  totalSpent: number;
  lastVisitAt: string | null;
  progress: number;
  readyToRedeem: boolean;
}

interface ReadyEntry {
  id: string;
  name: string | null;
  phone: string;
  points: number;
  visits: number;
  lastVisitAt: string | null;
}

function formatINR(cents: number) {
  return `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "amber" | "green" | "violet" | "default";
}) {
  const colors = {
    amber: "text-amber-500 bg-amber-500/10",
    green: "text-emerald-500 bg-emerald-500/10",
    violet: "text-violet-500 bg-violet-500/10",
    default: "text-primary bg-primary/10",
  };
  const c = colors[accent ?? "default"];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${c}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-emerald-500" : "bg-amber-400"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function RewardsPanel({ restaurantId }: { restaurantId: string }) {
  const [config, setConfig] = useState<RewardsConfig | null>(null);
  const [stats, setStats] = useState<RewardsStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [readyList, setReadyList] = useState<ReadyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(false);
  const [saving, startSave] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  // Redemption state
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemedIds, setRedeemedIds] = useState<Set<string>>(new Set());

  // Local draft for config editing
  const [draft, setDraft] = useState<Partial<RewardsConfig>>({});

  function load() {
    return fetch(`/api/v1/dashboard/${restaurantId}/rewards`)
      .then((r) => r.json())
      .then((d) => {
        setConfig(d.config);
        setStats(d.stats);
        setLeaderboard(d.leaderboard ?? []);
        setReadyList(d.readyList ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [restaurantId]);

  async function handleRedeem(customerId: string) {
    setRedeeming(customerId);
    try {
      const res = await fetch(`/api/v1/dashboard/${restaurantId}/rewards/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      if (res.ok) {
        setRedeemedIds((prev) => new Set([...prev, customerId]));
        setConfirmingId(null);
        // Refresh stats + lists after a short delay
        setTimeout(() => load(), 800);
      }
    } finally {
      setRedeeming(null);
    }
  }

  function handleToggle(enabled: boolean) {
    startToggle(async () => {
      await fetch(`/api/v1/dashboard/${restaurantId}/rewards`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      setConfig((c) => c ? { ...c, enabled } : c);
    });
  }

  function handleSaveConfig() {
    startSave(async () => {
      setSaveMsg(null);
      const res = await fetch(`/api/v1/dashboard/${restaurantId}/rewards`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setConfig((c) => c ? { ...c, ...draft } : c);
        setEditingConfig(false);
        setSaveMsg("Saved!");
        setTimeout(() => setSaveMsg(null), 2500);
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loyalty & Rewards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your #1 tool for turning first-time visitors into regulars.
          </p>
        </div>

        {/* Enable / Disable toggle */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-semibold">
              {config.enabled ? "Program is Live ✦" : "Program is Off"}
            </p>
            <p className="text-xs text-muted-foreground">
              {config.enabled
                ? "Customers earn points on every visit"
                : "Enable to start rewarding your regulars"}
            </p>
          </div>
          <button
            onClick={() => handleToggle(!config.enabled)}
            disabled={toggling}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${
              config.enabled ? "bg-emerald-500" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-200 ${
                config.enabled ? "left-[calc(100%-1.6rem)]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Disabled empty state */}
      {!config.enabled && (
        <div className="rounded-2xl border border-dashed border-border bg-card px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-3xl">
            🏆
          </div>
          <h2 className="text-lg font-semibold">Start your loyalty program</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Reward customers with points for every visit. Customers who feel valued come back 3× more often.
          </p>
          <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3 text-center">
            {[
              { emoji: "⭐", label: "Points per visit" },
              { emoji: "🎁", label: "Custom reward" },
              { emoji: "📊", label: "Live insights" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xl">{f.emoji}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>
          <Button
            className="mt-8 gap-2"
            onClick={() => handleToggle(true)}
            disabled={toggling}
          >
            {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Enable rewards program
          </Button>
        </div>
      )}

      {/* Active program */}
      {config.enabled && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard icon={Users} label="Members" value={stats.totalMembers} sub="earning points" accent="default" />
              <StatCard icon={Star} label="Avg points" value={stats.avgPoints} sub="per member" accent="amber" />
              <StatCard icon={Gift} label="Ready to redeem" value={stats.readyToRedeem} sub={`≥ ${config.redemptionThreshold} pts`} accent="green" />
              <StatCard icon={TrendingUp} label="Almost there" value={stats.closeToRedeem} sub="within 30% of reward" accent="violet" />
              <StatCard icon={Repeat2} label="Redeemed" value={stats.totalRedemptions} sub="rewards given out" accent="default" />
            </div>
          )}

          {/* Program config card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-4 w-4" /> Program settings
                  </CardTitle>
                  <CardDescription>How points are earned and what customers win</CardDescription>
                </div>
                {!editingConfig && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setDraft({
                        pointsPerVisit: config.pointsPerVisit,
                        redemptionThreshold: config.redemptionThreshold,
                        rewardTitle: config.rewardTitle,
                        rewardDescription: config.rewardDescription ?? "",
                      });
                      setEditingConfig(true);
                    }}
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingConfig ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Points per visit</Label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={draft.pointsPerVisit ?? config.pointsPerVisit}
                        onChange={(e) => setDraft((d) => ({ ...d, pointsPerVisit: parseInt(e.target.value) || 1 }))}
                      />
                      <p className="text-xs text-muted-foreground">Awarded once per café visit when at least one order is served</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Redemption threshold</Label>
                      <Input
                        type="number"
                        min={1}
                        value={draft.redemptionThreshold ?? config.redemptionThreshold}
                        onChange={(e) => setDraft((d) => ({ ...d, redemptionThreshold: parseInt(e.target.value) || 10 }))}
                      />
                      <p className="text-xs text-muted-foreground">Points needed to earn one reward</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reward name</Label>
                    <Input
                      value={draft.rewardTitle ?? config.rewardTitle}
                      placeholder="e.g. Free Coffee, 20% off, Free Brownie"
                      onChange={(e) => setDraft((d) => ({ ...d, rewardTitle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reward description <span className="text-muted-foreground">(optional)</span></Label>
                    <Textarea
                      rows={2}
                      value={draft.rewardDescription ?? ""}
                      placeholder="e.g. Any hot or cold beverage up to ₹200"
                      onChange={(e) => setDraft((d) => ({ ...d, rewardDescription: e.target.value }))}
                    />
                  </div>

                  {/* Live preview */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Customer sees</p>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      {draft.pointsPerVisit ?? config.pointsPerVisit} pts per visit · {draft.rewardTitle || "Reward"} at {draft.redemptionThreshold ?? config.redemptionThreshold} pts
                    </p>
                    {(draft.rewardDescription || config.rewardDescription) && (
                      <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                        {draft.rewardDescription ?? config.rewardDescription}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      That's {Math.ceil((draft.redemptionThreshold ?? config.redemptionThreshold) / (draft.pointsPerVisit ?? config.pointsPerVisit))} visits to earn a reward
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveConfig} disabled={saving} className="gap-2">
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save changes
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingConfig(false)}>Cancel</Button>
                    {saveMsg && <p className="text-sm text-emerald-600">{saveMsg}</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Earning rule */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-lg">⭐</div>
                    <div>
                      <p className="font-semibold">{config.pointsPerVisit} points per visit</p>
                      <p className="text-sm text-muted-foreground">Awarded once per café visit when an order is served</p>
                    </div>
                  </div>
                  {/* Reward */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-lg">🎁</div>
                    <div>
                      <p className="font-semibold">{config.rewardTitle} <span className="text-muted-foreground font-normal">at {config.redemptionThreshold} points</span></p>
                      {config.rewardDescription && (
                        <p className="text-sm text-muted-foreground">{config.rewardDescription}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        ≈ {Math.ceil(config.redemptionThreshold / config.pointsPerVisit)} visits to earn
                      </p>
                    </div>
                  </div>
                  {saveMsg && <p className="text-sm text-emerald-600">{saveMsg}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ready to redeem */}
          {readyList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Gift className="h-4 w-4" />
                  Ready to redeem ({readyList.filter((c) => !redeemedIds.has(c.id)).length})
                </CardTitle>
                <CardDescription>
                  These customers have earned a <strong>{config.rewardTitle}</strong>. Mark as redeemed after you give them the reward.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {readyList.map((c) => {
                  const done = redeemedIds.has(c.id);
                  const confirming = confirmingId === c.id;
                  const isRedeeming = redeeming === c.id;

                  if (done) return null; // fade out after redemption

                  return (
                    <div
                      key={c.id}
                      className={`overflow-hidden rounded-xl border transition-all duration-300 ${
                        confirming
                          ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/30"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {(c.name ?? c.phone).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {c.name ?? <span className="italic text-muted-foreground">Anonymous</span>}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />+91 {c.phone}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 ml-auto">
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">⭐ {c.points} pts</p>
                            <p className="text-xs text-muted-foreground">{c.visits} visit{c.visits !== 1 ? "s" : ""}</p>
                          </div>
                          {!confirming ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                              onClick={() => setConfirmingId(c.id)}
                            >
                              <Gift className="h-3.5 w-3.5" />
                              Redeem
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                              disabled={isRedeeming}
                              onClick={() => handleRedeem(c.id)}
                            >
                              {isRedeeming
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Check className="h-3.5 w-3.5" />}
                              Confirm
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Confirmation strip */}
                      {confirming && (
                        <div className="flex items-center justify-between border-t border-emerald-200/60 bg-emerald-50/60 px-4 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">
                            Give them their <strong>{config.rewardTitle}</strong> then confirm. Their points will reset and they start earning again.
                          </p>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="ml-3 shrink-0 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {readyList.every((c) => redeemedIds.has(c.id)) && (
                  <p className="py-4 text-center text-sm text-muted-foreground">All redeemed! 🎉</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Loyalty leaderboard
                </CardTitle>
                <CardDescription>Top customers ranked by points earned</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3">
                      {/* Rank */}
                      <span className={`w-6 shrink-0 text-center text-sm font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                      </span>
                      {/* Avatar */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {(c.name ?? c.phone).charAt(0).toUpperCase()}
                      </div>
                      {/* Name + progress */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-medium">
                            {c.name ?? <span className="italic text-muted-foreground">+91 {c.phone}</span>}
                          </p>
                          <span className="ml-2 shrink-0 text-sm font-bold text-amber-500">⭐ {c.points}</span>
                        </div>
                        <ProgressBar value={c.points} max={config.redemptionThreshold} className="mt-1.5" />
                        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                          <span>{c.visits} visits · {formatINR(c.totalSpent)} spent</span>
                          <span>
                            {c.readyToRedeem
                              ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ready! 🎁</span>
                              : `${config.redemptionThreshold - c.points} to go`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty leaderboard */}
          {leaderboard.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border px-8 py-12 text-center">
              <p className="text-3xl">🌱</p>
              <p className="mt-3 font-medium">No members yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Points are awarded automatically when a customer's order is marked served and they've shared their phone number.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
