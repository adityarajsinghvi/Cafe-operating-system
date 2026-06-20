"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2, X, Check, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SectionWithCount {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  itemCount: number;
}

interface Props {
  restaurantId: string;
  initialSections: SectionWithCount[];
}

export function SectionsManager({ restaurantId, initialSections }: Props) {
  const [sections, setSections] = useState<SectionWithCount[]>(initialSections);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const base = `/api/v1/dashboard/${restaurantId}/sections`;

  async function handleCreate() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), emoji: newEmoji.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSections((prev) => [...prev, { ...data.section, itemCount: 0 }]);
      setNewName("");
      setNewEmoji("");
      setCreating(false);
    });
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), emoji: editEmoji.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSections((prev) => prev.map((s) => s.id === id ? { ...s, name: data.section.name, emoji: data.section.emoji } : s));
      setEditingId(null);
    });
  }

  async function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      const res = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (!res.ok) return;
      setSections((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !currentActive } : s));
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this section? Items will become uncategorised.")) return;
    startTransition(async () => {
      const res = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setSections((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {sections.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No sections yet. Create one to group your menu.
        </div>
      )}

      <div className="space-y-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-opacity",
              !section.isActive && "opacity-50",
            )}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />

            {editingId === section.id ? (
              <>
                <input
                  value={editEmoji}
                  onChange={(e) => setEditEmoji(e.target.value)}
                  className="w-10 rounded-lg border border-border bg-background px-2 py-1 text-center text-sm"
                  placeholder="✦"
                  maxLength={2}
                />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate(section.id)}
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(section.id)}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="text-xl leading-none">{section.emoji ?? "✦"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{section.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {section.itemCount} item{section.itemCount !== 1 ? "s" : ""}
                    {!section.isActive && " · hidden from guests"}
                  </p>
                </div>

                {/* Actions — visible on hover */}
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setEditingId(section.id);
                      setEditName(section.name);
                      setEditEmoji(section.emoji ?? "");
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleToggle(section.id, section.isActive)}
                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                    title={section.isActive ? "Hide from guests" : "Show to guests"}
                  >
                    {section.isActive
                      ? <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(section.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-destructive/10"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {creating ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-card px-4 py-3">
          <input
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            className="w-10 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm"
            placeholder="✦"
            maxLength={2}
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Section name, e.g. Drinks"
            className="h-9 flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <Button size="sm" onClick={handleCreate} disabled={isPending || !newName.trim()}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewName(""); setNewEmoji(""); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add section
        </button>
      )}
    </div>
  );
}
