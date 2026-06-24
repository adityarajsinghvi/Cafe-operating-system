"use client";

import Image from "next/image";
import {
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { getRuleBasedTags } from "@/lib/menu/tag-rules";
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
import { cn } from "@/lib/utils";
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

const DIETARY_DOT: Record<DietaryType, string> = {
  veg:     "bg-green-500",
  vegan:   "bg-emerald-700",
  egg:     "bg-yellow-400",
  non_veg: "bg-red-500",
  unknown: "bg-gray-300",
};

const DIETARY_LABEL: Record<DietaryType, string> = {
  veg:     "Veg",
  vegan:   "Vegan",
  egg:     "Egg",
  non_veg: "Non-veg",
  unknown: "Unknown",
};

/* ── Tag editor (no AI suggest) ──────────────────────────────────────────── */
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
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current && tags.length === 0 && name) {
      seeded.current = true;
      const ruleTags = getRuleBasedTags(name, description, dietaryType);
      if (ruleTags.length > 0) onChange(ruleTags);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <Tag className="h-3.5 w-3.5" />
        Tags
      </Label>
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
          placeholder={tags.length === 0 ? "Type tag, press Enter…" : "Add tag…"}
          className="min-w-[120px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}

/* ── Expanded item detail panel ───────────────────────────────────────────── */
function ItemDetail({
  item,
  categoryId,
  restaurantId,
  isSaving,
  savingId,
  uploadingId,
  onUpdate,
  onSave,
  onUpload,
  onDelete,
}: {
  item: EditableItem;
  categoryId: string;
  restaurantId: string;
  isSaving: boolean;
  savingId: string | null;
  uploadingId: string | null;
  onUpdate: (patch: Partial<EditableItem>) => void;
  onSave: () => void;
  onUpload: (file: File) => void;
  onDelete: () => void;
}) {
  return (
    <div className="border-t border-border/50 bg-muted/20 px-4 py-4 space-y-4">
      {/* Image */}
      <div className="flex items-start gap-3">
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
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors">
          <ImagePlus className="h-4 w-4" />
          {uploadingId === item.id ? "Uploading…" : "Change photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
        </label>
      </div>

      {/* Name + Price */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${item.id}`}>Name</Label>
          <Input
            id={`name-${item.id}`}
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`price-${item.id}`}>Price (₹)</Label>
          <Input
            id={`price-${item.id}`}
            type="number"
            min={0}
            step={0.01}
            value={(item.priceCents / 100).toFixed(item.priceCents % 100 === 0 ? 0 : 2)}
            onChange={(e) =>
              onUpdate({ priceCents: Math.round(parseFloat(e.target.value || "0") * 100) })
            }
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor={`desc-${item.id}`}>Description</Label>
        <Textarea
          id={`desc-${item.id}`}
          value={item.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={2}
        />
      </div>

      {/* Tags */}
      <TagEditor
        itemId={item.id}
        tags={item.tags}
        name={item.name}
        description={item.description}
        dietaryType={item.dietaryType}
        onChange={(tags) => onUpdate({ tags })}
      />

      {/* Flags + Dietary */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {(
          [
            ["isPopular", "Popular"],
            ["isSpecial", "Special"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={item[key]}
              onChange={(e) => onUpdate({ [key]: e.target.checked })}
              className="rounded border-border"
            />
            {label}
          </label>
        ))}
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Diet:</span>
          <select
            value={item.dietaryType}
            onChange={(e) => onUpdate({ dietaryType: e.target.value as DietaryType })}
            className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
          >
            {(["veg", "non_veg", "egg", "vegan", "unknown"] as DietaryType[]).map((t) => (
              <option key={t} value={t}>{DIETARY_LABEL[t]}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving && savingId === item.id}
          className="gap-2"
        >
          {isSaving && savingId === item.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive gap-2"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete item
        </Button>
      </div>
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

  // Collapsed UI state
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const withSection = initialCategories.map((cat) => ({
      ...cat,
      sectionId: cat.items[0]?.sectionId ?? null,
    }));
    setCategories(withSection);
  }, [initialCategories]);

  function toggleCategory(categoryId: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId);
      return next;
    });
  }

  function toggleItem(itemId: string) {
    setExpandedItemId((prev) => (prev === itemId ? null : itemId));
  }

  function updateItem(categoryId: string, itemId: string, patch: Partial<EditableItem>) {
    setCategories((current) =>
      current.map((cat) =>
        cat.id === categoryId
          ? { ...cat, items: cat.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) }
          : cat,
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

  function toggleAvailability(categoryId: string, item: EditableItem) {
    const updated = { ...item, isAvailable: !item.isAvailable };
    updateItem(categoryId, item.id, { isAvailable: updated.isAvailable });
    saveItem(categoryId, updated);
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
    if (!window.confirm("Delete this section and all its items?")) return;
    startSave(async () => {
      const result = await deleteCategoryAction(restaurantId, categoryId);
      if (!result.error) setCategories((c) => c.filter((cat) => cat.id !== categoryId));
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  function handleDeleteItem(categoryId: string, itemId: string) {
    if (!window.confirm("Delete this item?")) return;
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
        if (expandedItemId === itemId) setExpandedItemId(null);
      }
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
    const reordered = [...category.items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved);
    setCategories((current) =>
      current.map((c) => c.id === categoryId ? { ...c, items: reordered } : c),
    );
    startReorder(async () => {
      await reorderItemsAction(restaurantId, categoryId, reordered.map((i) => i.id));
    });
  }

  if (!categories.length) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-semibold">No menu yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first section below to get started.
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
          <Input name="name" placeholder="Section name (e.g. Hot Drinks)" required autoFocus />
          <Button type="submit" className="shrink-0">Create section</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="rounded-xl bg-muted px-4 py-2 text-sm">{message}</p>
      )}

      {categories.map((category, categoryIndex) => {
        const isCollapsed = collapsedCategories.has(category.id);

        return (
          <div
            key={category.id}
            className="overflow-hidden rounded-2xl border border-border"
          >
            {/* ── Category header ── */}
            <div
              className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors select-none"
              onClick={() => toggleCategory(category.id)}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  !isCollapsed && "rotate-90",
                )}
              />
              <span className="flex-1 font-semibold">{category.name}</span>
              <span className="text-xs text-muted-foreground">
                {category.items.length} {category.items.length === 1 ? "item" : "items"}
              </span>

              {/* Section assignment (for plans that use sections) */}
              {sections.length > 0 && (
                <select
                  value={category.sectionId ?? ""}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleAssignSection(category.id, e.target.value || null)}
                  className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">No section</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.emoji ? `${s.emoji} ` : ""}{s.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Reorder category */}
              <div
                className="flex gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  disabled={categoryIndex === 0 || isReordering}
                  onClick={() => moveCategory(categoryIndex, -1)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  aria-label="Move section up"
                >
                  ↑
                </button>
                <button
                  disabled={categoryIndex === categories.length - 1 || isReordering}
                  onClick={() => moveCategory(categoryIndex, 1)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  aria-label="Move section down"
                >
                  ↓
                </button>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}
                className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete section"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* ── Items list ── */}
            {!isCollapsed && (
              <div className="border-t border-border">
                {category.items.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    No items yet — add one below.
                  </p>
                )}

                {category.items.map((item, itemIndex) => (
                  <div key={item.id} className="border-b border-border/50 last:border-b-0">
                    {/* Collapsed row */}
                    <div
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                      onClick={() => toggleItem(item.id)}
                    >
                      {/* Dietary dot */}
                      <div
                        className={cn("h-2 w-2 shrink-0 rounded-full", DIETARY_DOT[item.dietaryType])}
                        title={DIETARY_LABEL[item.dietaryType]}
                      />

                      {/* Name */}
                      <span
                        className={cn(
                          "flex-1 truncate text-sm font-medium",
                          !item.isAvailable && "text-muted-foreground line-through",
                        )}
                      >
                        {item.name}
                      </span>

                      {/* Price */}
                      <span className="shrink-0 text-sm text-muted-foreground">
                        ₹{(item.priceCents / 100).toFixed(item.priceCents % 100 === 0 ? 0 : 2)}
                      </span>

                      {/* Quick availability toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAvailability(category.id, item); }}
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                          item.isAvailable
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-600 hover:bg-red-200",
                        )}
                      >
                        {savingId === item.id ? "…" : item.isAvailable ? "Available" : "Off"}
                      </button>

                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                          expandedItemId === item.id && "rotate-180",
                        )}
                      />
                    </div>

                    {/* Expanded detail panel */}
                    {expandedItemId === item.id && (
                      <ItemDetail
                        item={item}
                        categoryId={category.id}
                        restaurantId={restaurantId}
                        isSaving={isSaving}
                        savingId={savingId}
                        uploadingId={uploadingId}
                        onUpdate={(patch) => updateItem(category.id, item.id, patch)}
                        onSave={() => saveItem(category.id, item)}
                        onUpload={(file) => uploadImage(item, file)}
                        onDelete={() => handleDeleteItem(category.id, item.id)}
                      />
                    )}
                  </div>
                ))}

                {/* Inline add item */}
                {addingToCategory === category.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      fd.append("dietaryType", "unknown");
                      handleCreateItem(category.id, fd);
                      e.currentTarget.reset();
                      setAddingToCategory(null);
                    }}
                    className="flex items-center gap-2 border-t border-border/50 p-3"
                  >
                    <Input
                      name="name"
                      placeholder="Item name"
                      required
                      autoFocus
                      className="flex-1"
                    />
                    <Input
                      name="priceCents"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="₹ Price"
                      required
                      className="w-24 shrink-0"
                    />
                    <Button type="submit" size="sm" disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddingToCategory(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setAddingToCategory(category.id);
                      setExpandedItemId(null);
                    }}
                    className="flex w-full items-center gap-2 border-t border-border/50 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Add item
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add section */}
      {addingSection ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateCategory(new FormData(e.currentTarget));
            e.currentTarget.reset();
            setAddingSection(false);
          }}
          className="flex gap-2"
        >
          <Input
            name="name"
            placeholder="Section name (e.g. Cold Drinks)"
            required
            autoFocus
            className="flex-1"
          />
          <Button type="submit" disabled={isSaving} className="shrink-0">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAddingSection(false)}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <button
          onClick={() => setAddingSection(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add section
        </button>
      )}
    </div>
  );
}
