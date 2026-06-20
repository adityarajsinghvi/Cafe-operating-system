"use client";

import { Loader2, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { DietaryBadge } from "@/components/onboarding/dietary-badge";
import { publishMenuAction, updateMenuDraftAction } from "@/lib/actions/menu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  computeMenuSummary,
  type DietaryType,
  type DraftMenuCategory,
  type MenuDraftPayload,
  type MenuDraftSummary,
} from "@/types/menu";
import { getRuleBasedTags, mergeTags } from "@/lib/menu/tag-rules";

function formatPrice(cents: number) {
  return `₹${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function TagEditor({
  itemId,
  tags,
  onChange,
  itemName,
  description,
  dietaryType,
}: {
  itemId: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  itemName: string;
  description?: string;
  dietaryType: string;
}) {
  const [input, setInput] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  // Auto-apply rule-based tags on first render if none exist
  useEffect(() => {
    if (tags.length === 0 && itemName) {
      const ruleTags = getRuleBasedTags(itemName, description, dietaryType);
      if (ruleTags.length > 0) onChange(ruleTags);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addTag(input);
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  async function suggestTags() {
    setIsSuggesting(true);
    try {
      const res = await fetch("/api/v1/dashboard/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: itemName, description, dietaryType, existingTags: tags }),
      });
      const data = await res.json();
      onChange(mergeTags(tags, data.tags ?? []));
      setAiUsed(true);
    } catch {
      // silent
    } finally {
      setIsSuggesting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Tags</Label>
        {!aiUsed && (
          <button
            type="button"
            onClick={suggestTags}
            disabled={isSuggesting}
            className="flex items-center gap-1 text-xs text-primary hover:opacity-80 disabled:opacity-50"
          >
            {isSuggesting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            AI suggest
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-input bg-background px-3 py-2 min-h-[40px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) { addTag(input); setInput(""); } }}
          placeholder={tags.length === 0 ? "Type a tag and press Enter…" : ""}
          className="min-w-[120px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

export function MenuReviewEditor({
  restaurantId,
  draftId,
  initialPayload,
  initialSummary,
}: {
  restaurantId: string;
  draftId: string;
  initialPayload: MenuDraftPayload;
  initialSummary: MenuDraftSummary;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState(initialPayload);
  const [summary, setSummary] = useState(initialSummary);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isPublishing, startPublish] = useTransition();

  const stats = useMemo(() => computeMenuSummary(payload), [payload]);

  function updateCategory(
    categoryId: string,
    updater: (category: DraftMenuCategory) => DraftMenuCategory,
  ) {
    setPayload((current) => ({
      categories: current.categories.map((category) =>
        category.id === categoryId ? updater(category) : category,
      ),
    }));
  }

  function handleSave() {
    setError(null);
    setMessage(null);

    startSave(async () => {
      const formData = new FormData();
      formData.append("restaurantId", restaurantId);
      formData.append("draftId", draftId);
      formData.append("payload", JSON.stringify(payload));

      const result = await updateMenuDraftAction({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSummary(stats);
      setMessage("Changes saved");
      router.refresh();
    });
  }

  function handlePublish() {
    setError(null);
    setMessage(null);

    startPublish(async () => {
      const formData = new FormData();
      formData.append("restaurantId", restaurantId);
      formData.append("draftId", draftId);
      formData.append("payload", JSON.stringify(payload));

      await updateMenuDraftAction({}, formData);
      await publishMenuAction({}, formData);
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <CardTitle className="text-lg sm:text-xl">
                We found your menu
              </CardTitle>
              <CardDescription className="mt-1 text-sm sm:text-base">
                Review and edit before publishing. You can change anything.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Categories", value: stats.categoryCount },
              { label: "Items", value: stats.itemCount },
              { label: "Vegetarian", value: stats.vegCount },
              { label: "Beverages", value: stats.beverageCount },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-background/80 p-3 text-center"
              >
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {payload.categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={category.name}
                    onChange={(e) =>
                      updateCategory(category.id, (current) => ({
                        ...current,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-7 shrink-0 text-destructive"
                  onClick={() =>
                    setPayload((current) => ({
                      categories: current.categories.filter(
                        (entry) => entry.id !== category.id,
                      ),
                    }))
                  }
                  aria-label="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="space-y-3 rounded-xl border border-border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <DietaryBadge type={item.dietaryType} />
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={item.isPopular ?? false}
                          onChange={(e) =>
                            updateCategory(category.id, (current) => ({
                              ...current,
                              items: current.items.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, isPopular: e.target.checked }
                                  : entry,
                              ),
                            }))
                          }
                        />
                        Popular
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={item.isSpecial ?? false}
                          onChange={(e) =>
                            updateCategory(category.id, (current) => ({
                              ...current,
                              items: current.items.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, isSpecial: e.target.checked }
                                  : entry,
                              ),
                            }))
                          }
                        />
                        Special
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={item.isAvailable !== false}
                          onChange={(e) =>
                            updateCategory(category.id, (current) => ({
                              ...current,
                              items: current.items.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, isAvailable: e.target.checked }
                                  : entry,
                              ),
                            }))
                          }
                        />
                        Available
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Item name</Label>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          updateCategory(category.id, (current) => ({
                            ...current,
                            items: current.items.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, name: e.target.value }
                                : entry,
                            ),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Price (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={Math.round(item.priceCents / 100)}
                        onChange={(e) =>
                          updateCategory(category.id, (current) => ({
                            ...current,
                            items: current.items.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    priceCents:
                                      Math.round(Number(e.target.value) || 0) *
                                      100,
                                  }
                                : entry,
                            ),
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Display: {formatPrice(item.priceCents)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Dietary</Label>
                      <select
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                        value={item.dietaryType}
                        onChange={(e) =>
                          updateCategory(category.id, (current) => ({
                            ...current,
                            items: current.items.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    dietaryType: e.target.value as DietaryType,
                                  }
                                : entry,
                            ),
                          }))
                        }
                      >
                        <option value="veg">Veg</option>
                        <option value="non_veg">Non-Veg</option>
                        <option value="egg">Egg</option>
                        <option value="vegan">Vegan</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={item.description ?? ""}
                        onChange={(e) =>
                          updateCategory(category.id, (current) => ({
                            ...current,
                            items: current.items.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, description: e.target.value }
                                : entry,
                            ),
                          }))
                        }
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <TagEditor
                        itemId={item.id}
                        tags={(item as any).tags ?? []}
                        onChange={(tags) =>
                          updateCategory(category.id, (current) => ({
                            ...current,
                            items: current.items.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, tags }
                                : entry,
                            ),
                          }))
                        }
                        itemName={item.name}
                        description={item.description}
                        dietaryType={item.dietaryType}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        updateCategory(category.id, (current) => ({
                          ...current,
                          items: current.items.filter(
                            (entry) => entry.id !== item.id,
                          ),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove item
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {message && <p className="text-green-600 dark:text-green-400">{message}</p>}
            {error && <p className="text-destructive">{error}</p>}
            {!message && !error && (
              <p className="text-muted-foreground">
                Last extracted: {summary.itemCount} items
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={isSaving || isPublishing}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save changes
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={isSaving || isPublishing || !payload.categories.length}
              className="w-full sm:w-auto"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Save & publish menu"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
