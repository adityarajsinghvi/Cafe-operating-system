"use client";

import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DietaryBadge } from "@/components/onboarding/dietary-badge";
import { getRuleBasedTags, mergeTags } from "@/lib/menu/tag-rules";
import {
  createCategoryAction,
  createMenuItemAction,
  deleteCategoryAction,
  deleteMenuItemAction,
  reorderCategoriesAction,
  reorderItemsAction,
  updateMenuItemAction,
  uploadMenuItemImageAction,
} from "@/lib/actions/menu-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DietaryType } from "@/types/menu";

type EditableItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  dietaryType: DietaryType;
  isAvailable: boolean;
  isPopular: boolean;
  isSpecial: boolean;
  tags: string[];
  sectionId: string | null;
};

type EditableCategory = {
  id: string;
  name: string;
  items: EditableItem[];
  sectionId: string | null;
};

type SectionOption = {
  id: string;
  name: string;
  emoji: string | null;
};

/* ── Tag chip row with AI suggestion ──────────────────────────────────────── */
function TagEditor({
  itemId,
  tags,
  name,
  description,
  dietaryType,
  onChange,
}: {
  itemId: string;
  tags: string[];
  name: string;
  description: string;
  dietaryType: DietaryType;
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [isLoading, startLoad] = useTransition();
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const seeded = useRef(false);
  const storageKey = `parcha-ai-suggested-${itemId}`;
  const [aiUsed, setAiUsed] = useState(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });

  // Auto-seed rule-based tags for items with no tags yet
  useEffect(() => {
    if (!seeded.current && tags.length === 0 && name) {
      seeded.current = true;
      const ruleTags = getRuleBasedTags(name, description, dietaryType);
      if (ruleTags.length > 0) onChange(ruleTags);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  function addTag(tag: string) {
    const cleaned = tag.trim().toLowerCase();
    if (!cleaned || tags.includes(cleaned)) return;
    onChange([...tags, cleaned]);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  function handleSuggest() {
    setSuggestionError(null);
    startLoad(async () => {
      try {
        const res = await fetch("/api/v1/dashboard/suggest-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, dietaryType, existingTags: tags }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        onChange(mergeTags(tags, data.tags ?? []));
        setAiUsed(true);
        try { localStorage.setItem(storageKey, "1"); } catch {}
      } catch {
        setSuggestionError("Couldn't get suggestions");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          Tags
        </Label>
        {!aiUsed && (
          <button
            type="button"
            onClick={handleSuggest}
            disabled={isLoading || !name}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-violet-400/60 px-2.5 py-1 text-xs font-medium text-violet-400 hover:border-violet-400 hover:bg-violet-400/10 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            AI suggest
          </button>
        )}
      </div>

      <div className="flex min-h-9 flex-wrap gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) { addTag(input); setInput(""); } }}
          placeholder={tags.length === 0 ? "Type tag, press Enter or comma…" : "Add tag…"}
          className="min-w-[120px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      {suggestionError && (
        <p className="text-xs text-destructive">{suggestionError}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Tags help AI search find this item (e.g. spicy, coffee, dessert)
      </p>
    </div>
  );
}

/* ── Main editor ──────────────────────────────────────────────────────────── */
export function MenuEditor({
  restaurantId,
  categories: initialCategories,
  sections = [],
}: {
  restaurantId: string;
  categories: EditableCategory[];
  sections?: SectionOption[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isReordering, startReorder] = useTransition();
  const router = useRouter();

  useEffect(() => {
    // Derive sectionId per category from first item's sectionId
    const withSection = initialCategories.map((cat) => ({
      ...cat,
      sectionId: cat.items[0]?.sectionId ?? null,
    }));
    setCategories(withSection);
  }, [initialCategories]);

  function updateItem(
    categoryId: string,
    itemId: string,
    patch: Partial<EditableItem>,
  ) {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            }
          : category,
      ),
    );
  }

  function saveItem(categoryId: string, item: EditableItem) {
    setSavingId(item.id);
    setMessage(null);

    startSave(async () => {
      const formData = new FormData();
      formData.append("name", item.name);
      formData.append("description", item.description);
      formData.append("priceCents", (item.priceCents / 100).toString());
      formData.append("dietaryType", item.dietaryType);
      if (item.isAvailable) formData.append("isAvailable", "on");
      if (item.isPopular) formData.append("isPopular", "on");
      if (item.isSpecial) formData.append("isSpecial", "on");
      formData.append("tags", item.tags.join(","));

      const result = await updateMenuItemAction(restaurantId, item.id, formData);
      setSavingId(null);
      setMessage(result.error ?? result.success ?? null);
    });
  }

  function uploadImage(item: EditableItem, file: File) {
    setUploadingId(item.id);
    setMessage(null);

    const formData = new FormData();
    formData.append("image", file);

    startSave(async () => {
      const result = await uploadMenuItemImageAction(restaurantId, item.id, formData);
      setUploadingId(null);
      if (result.error) { setMessage(result.error); return; }
      if (result.imageUrl) updateItem(item.categoryId, item.id, { imageUrl: result.imageUrl });
      setMessage(result.success ?? "Image uploaded");
    });
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved);
    setCategories(reordered);
    startReorder(async () => {
      await reorderCategoriesAction(restaurantId, reordered.map((c) => c.id));
    });
  }

  function moveItem(categoryId: string, index: number, direction: -1 | 1) {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= category.items.length) return;
    const reorderedItems = [...category.items];
    const [moved] = reorderedItems.splice(index, 1);
    reorderedItems.splice(nextIndex, 0, moved);
    setCategories((current) =>
      current.map((c) => (c.id === categoryId ? { ...c, items: reorderedItems } : c)),
    );
    startReorder(async () => {
      await reorderItemsAction(restaurantId, categoryId, reorderedItems.map((i) => i.id));
    });
  }

  function handleCreateCategory(formData: FormData) {
    setMessage(null);
    startSave(async () => {
      const result = await createCategoryAction(restaurantId, formData);
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  function handleCreateItem(categoryId: string, formData: FormData) {
    setMessage(null);
    startSave(async () => {
      const result = await createMenuItemAction(restaurantId, categoryId, formData);
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  function handleDeleteCategory(categoryId: string) {
    if (!window.confirm("Delete this category and all its items?")) return;
    startSave(async () => {
      const result = await deleteCategoryAction(restaurantId, categoryId);
      if (!result.error) setCategories((c) => c.filter((cat) => cat.id !== categoryId));
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  function handleAssignSection(categoryId: string, sectionId: string | null) {
    setCategories((prev) =>
      prev.map((cat) => cat.id === categoryId ? { ...cat, sectionId } : cat),
    );
    startSave(async () => {
      await fetch(`/api/v1/dashboard/${restaurantId}/sections/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, sectionId }),
      });
    });
  }

  function handleDeleteItem(categoryId: string, itemId: string) {
    if (!window.confirm("Delete this menu item?")) return;
    startSave(async () => {
      const result = await deleteMenuItemAction(restaurantId, itemId);
      if (!result.error) {
        setCategories((current) =>
          current.map((cat) =>
            cat.id === categoryId
              ? { ...cat, items: cat.items.filter((i) => i.id !== itemId) }
              : cat,
          ),
        );
      }
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  if (!categories.length) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-semibold">No menu to edit</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Publish a menu first via onboarding, or add a category below.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateCategory(new FormData(e.currentTarget));
            e.currentTarget.reset();
          }}
          className="flex gap-2"
        >
          <Input name="name" placeholder="New category name" required />
          <Button type="submit">Add category</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {message && (
        <p className="rounded-xl bg-muted px-4 py-2 text-sm">{message}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCreateCategory(new FormData(e.currentTarget));
          e.currentTarget.reset();
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <Input name="name" placeholder="Add new category" required />
        <Button type="submit" variant="outline" className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add category
        </Button>
      </form>

      {categories.map((category, categoryIndex) => (
        <section
          key={category.id}
          className="space-y-4 rounded-2xl border border-border p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">{category.name}</h2>
              {sections.length > 0 && (
                <select
                  value={category.sectionId ?? ""}
                  onChange={(e) => handleAssignSection(category.id, e.target.value || null)}
                  className="rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">No section</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.emoji ? `${s.emoji} ` : ""}{s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={categoryIndex === 0 || isReordering}
                onClick={() => moveCategory(categoryIndex, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={categoryIndex === categories.length - 1 || isReordering}
                onClick={() => moveCategory(categoryIndex, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => handleDeleteCategory(category.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>


          <div className="space-y-4">
            {category.items.map((item, itemIndex) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/70 bg-card p-4 space-y-4"
              >
                {/* Image + basic fields row */}
                <div className="flex flex-wrap items-start gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">
                        🍽️
                      </div>
                    )}
                  </div>

                  <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40">
                    <ImagePlus className="h-4 w-4" />
                    {uploadingId === item.id ? "Uploading…" : "Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(item, file);
                      }}
                    />
                  </label>

                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${item.id}`}>Name</Label>
                      <Input
                        id={`name-${item.id}`}
                        value={item.name}
                        onChange={(e) =>
                          updateItem(category.id, item.id, { name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`price-${item.id}`}>Price (₹)</Label>
                      <Input
                        id={`price-${item.id}`}
                        type="number"
                        min={0}
                        step={0.01}
                        value={(item.priceCents / 100).toFixed(
                          item.priceCents % 100 === 0 ? 0 : 2,
                        )}
                        onChange={(e) =>
                          updateItem(category.id, item.id, {
                            priceCents: Math.round(parseFloat(e.target.value || "0") * 100),
                          })
                        }
                      />
                    </div>
                  </div>

                  <DietaryBadge type={item.dietaryType} />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor={`desc-${item.id}`}>Description</Label>
                  <Textarea
                    id={`desc-${item.id}`}
                    value={item.description}
                    onChange={(e) =>
                      updateItem(category.id, item.id, { description: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                {/* Tags with AI suggestion */}
                <TagEditor
                  itemId={item.id}
                  tags={item.tags}
                  name={item.name}
                  description={item.description}
                  dietaryType={item.dietaryType}
                  onChange={(tags) => updateItem(category.id, item.id, { tags })}
                />

                {/* Checkboxes + dietary */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {(
                    [
                      ["isAvailable", "Available"],
                      ["isPopular", "Popular"],
                      ["isSpecial", "Special"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item[key]}
                        onChange={(e) =>
                          updateItem(category.id, item.id, { [key]: e.target.checked })
                        }
                        className="rounded border-border"
                      />
                      {label}
                    </label>
                  ))}

                  <label className="flex items-center gap-2">
                    <span className="text-muted-foreground">Diet:</span>
                    <select
                      value={item.dietaryType}
                      onChange={(e) =>
                        updateItem(category.id, item.id, {
                          dietaryType: e.target.value as DietaryType,
                        })
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1"
                    >
                      {["veg", "non_veg", "egg", "vegan", "unknown"].map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveItem(category.id, item)}
                    disabled={(isSaving && savingId === item.id) || isReordering}
                    className="gap-2"
                  >
                    {isSaving && savingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save item
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={itemIndex === 0 || isReordering}
                    onClick={() => moveItem(category.id, itemIndex, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={itemIndex === category.items.length - 1 || isReordering}
                    onClick={() => moveItem(category.id, itemIndex, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDeleteItem(category.id, item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateItem(category.id, new FormData(e.currentTarget));
              e.currentTarget.reset();
            }}
            className="grid gap-2 rounded-xl border border-dashed border-border p-3 sm:grid-cols-4"
          >
            <Input name="name" placeholder="New item name" required />
            <Input
              name="priceCents"
              type="number"
              min={0}
              step={0.01}
              placeholder="Price"
              required
            />
            <select
              name="dietaryType"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              defaultValue="unknown"
            >
              {["veg", "non_veg", "egg", "vegan", "unknown"].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </form>
        </section>
      ))}
    </div>
  );
}
