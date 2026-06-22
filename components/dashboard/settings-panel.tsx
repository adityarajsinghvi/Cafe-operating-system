"use client";

import {
  Copy,
  Loader2,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  createTableAction,
  createTablesBulkAction,
  deleteTableAction,
  updateSettingsAction,
  updateTableAction,
} from "@/lib/actions/menu-editor";
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
  buildTableGuestUrl,
  generateTableQrDataUrl,
  openPrintableQrSheet,
} from "@/lib/tables/qr";
import type { RestaurantTable } from "@/types/order";

export function SettingsPanel({
  restaurantId,
  slug,
  restaurantName,
  name,
  description,
  primaryColor,
  city,
  smartSuggestionsEnabled,
  rewardsEnabled,
  orderingEnabled,
  tables,
}: {
  restaurantId: string;
  slug: string;
  restaurantName: string;
  name: string;
  description: string | null;
  primaryColor: string;
  city: string;
  smartSuggestionsEnabled: boolean;
  rewardsEnabled: boolean;
  orderingEnabled: boolean;
  tables: RestaurantTable[];
}) {
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [tableMessage, setTableMessage] = useState<string | null>(null);
  const [isSavingSettings, startSaveSettings] = useTransition();
  const [isCreatingTable, startCreateTable] = useTransition();
  const [isBulkCreating, startBulkCreate] = useTransition();
  const [isPrinting, setIsPrinting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const groupedTables = useMemo(() => {
    const groups = new Map<string, RestaurantTable[]>();

    for (const table of tables) {
      const key = table.zone?.trim() || "Main floor";
      const list = groups.get(key) ?? [];
      list.push(table);
      groups.set(key, list);
    }

    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tables]);

  function handleSettingsSubmit(formData: FormData) {
    setSettingsMessage(null);
    startSaveSettings(async () => {
      const result = await updateSettingsAction(restaurantId, formData);
      setSettingsMessage(result.error ?? result.success ?? null);
    });
  }

  function handleCreateTable(formData: FormData) {
    setTableMessage(null);
    startCreateTable(async () => {
      const result = await createTableAction(restaurantId, formData);
      setTableMessage(result.error ?? result.success ?? null);
    });
  }

  function handleBulkCreate(formData: FormData) {
    setTableMessage(null);
    startBulkCreate(async () => {
      const result = await createTablesBulkAction(restaurantId, formData);
      setTableMessage(result.error ?? result.success ?? null);
    });
  }

  function handleDeleteTable(tableId: string) {
    setDeletingId(tableId);
    deleteTableAction(restaurantId, tableId).then((result) => {
      setDeletingId(null);
      setTableMessage(result.error ?? result.success ?? null);
    });
  }

  function handleUpdateTable(tableId: string, formData: FormData) {
    updateTableAction(restaurantId, tableId, formData).then((result) => {
      setEditingId(null);
      setTableMessage(result.error ?? result.success ?? null);
    });
  }

  function copyTableUrl(label: string, token: string) {
    const url = buildTableGuestUrl(window.location.origin, slug, label, token);
    navigator.clipboard.writeText(url);
    setTableMessage("Table link copied!");
  }

  async function printAllQrCodes() {
    if (!tables.length) return;

    setIsPrinting(true);
    try {
      const prepared = await Promise.all(
        tables.map(async (table) => ({
          label: table.label,
          zone: table.zone,
          qrToken: table.qrToken,
          dataUrl: await generateTableQrDataUrl(
            buildTableGuestUrl(
              window.location.origin,
              slug,
              table.label,
              table.qrToken,
            ),
          ),
        })),
      );

      const opened = openPrintableQrSheet({
        restaurantName,
        tables: prepared,
        origin: window.location.origin,
        slug,
      });

      if (!opened) {
        setTableMessage("Allow pop-ups to print QR codes.");
      }
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Restaurant profile</CardTitle>
          <CardDescription>
            Basic info shown on your guest menu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSettingsSubmit(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={description ?? ""}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Brand color</Label>
              <div className="flex gap-3">
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  defaultValue={primaryColor}
                  className="h-11 w-16 cursor-pointer p-1"
                />
                <Input
                  defaultValue={primaryColor}
                  readOnly
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City (for smart suggestions)</Label>
              <Input
                id="city"
                name="city"
                defaultValue={city}
                placeholder="e.g. Bangalore, Mumbai, Delhi"
              />
              <p className="text-xs text-muted-foreground">
                Used to fetch live weather for contextual menu suggestions on the guest app.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <input
                type="checkbox"
                id="smartSuggestionsEnabled"
                name="smartSuggestionsEnabled"
                defaultChecked={smartSuggestionsEnabled}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
              />
              <div>
                <Label htmlFor="smartSuggestionsEnabled" className="cursor-pointer font-medium">
                  ✦ Smart suggestions
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Show an AI-powered contextual suggestion on the guest menu based on weather,
                  time of day, and the customer&apos;s taste profile.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <input
                type="checkbox"
                id="orderingEnabled"
                name="orderingEnabled"
                defaultChecked={orderingEnabled}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
              />
              <div>
                <Label htmlFor="orderingEnabled" className="cursor-pointer font-medium">
                  🧾 Table ordering
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Let guests add items to a cart and place orders from the table QR menu. Turn
                  this off to show a read-only digital menu only.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <input
                type="checkbox"
                id="rewardsEnabled"
                name="rewardsEnabled"
                defaultChecked={rewardsEnabled}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
              />
              <div>
                <Label htmlFor="rewardsEnabled" className="cursor-pointer font-medium">
                  🎁 Loyalty & rewards
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Let guests earn points toward a reward. Manage the reward title and thresholds
                  from the Rewards page.
                </p>
              </div>
            </div>

            {settingsMessage && (
              <p className="text-sm text-muted-foreground">{settingsMessage}</p>
            )}
            <Button type="submit" disabled={isSavingSettings} className="gap-2">
              {isSavingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Tables & QR codes
              </CardTitle>
              <CardDescription>
                Create tables, print QR sheets, and share ordering links.
              </CardDescription>
            </div>
            {tables.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isPrinting}
                onClick={printAllQrCodes}
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Print all QR
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateTable(new FormData(e.currentTarget));
              e.currentTarget.reset();
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="label">Table label</Label>
              <Input
                id="label"
                name="label"
                placeholder="e.g. T1, Patio 3"
                required
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="zone">Zone (optional)</Label>
              <Input id="zone" name="zone" placeholder="e.g. Indoor, Terrace" />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={isCreatingTable}
                className="w-full gap-2 sm:w-auto"
              >
                {isCreatingTable ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add table
              </Button>
            </div>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBulkCreate(new FormData(e.currentTarget));
            }}
            className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3"
          >
            <p className="text-sm font-medium">Bulk create tables</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Prefix</Label>
                <Input id="prefix" name="prefix" defaultValue="T" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  name="from"
                  type="number"
                  min={1}
                  defaultValue={1}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  name="to"
                  type="number"
                  min={1}
                  defaultValue={10}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-zone">Zone</Label>
                <Input id="bulk-zone" name="zone" placeholder="Optional" />
              </div>
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={isBulkCreating}
              className="gap-2"
            >
              {isBulkCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create range
            </Button>
          </form>

          {tableMessage && (
            <p className="text-sm text-muted-foreground">{tableMessage}</p>
          )}

          {tables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No tables yet. Add your first table or create a range above.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedTables.map(([zone, zoneTables]) => (
                <div key={zone} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {zone}
                  </h3>
                  <div className="space-y-3">
                    {zoneTables.map((table) => (
                      <div
                        key={table.id}
                        className="rounded-xl border border-border p-4"
                      >
                        {editingId === table.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleUpdateTable(
                                table.id,
                                new FormData(e.currentTarget),
                              );
                            }}
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                          >
                            <div className="flex-1 space-y-2">
                              <Label>Label</Label>
                              <Input
                                name="label"
                                defaultValue={table.label}
                                required
                              />
                            </div>
                            <div className="flex-1 space-y-2">
                              <Label>Zone</Label>
                              <Input
                                name="zone"
                                defaultValue={table.zone ?? ""}
                              />
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="isActive"
                                defaultChecked={table.isActive}
                              />
                              Active
                            </label>
                            <div className="flex gap-2">
                              <Button type="submit" size="sm">
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-lg font-semibold">
                                  {table.label}
                                </p>
                                {!table.isActive && (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 font-mono text-xs text-muted-foreground">
                                /r/{slug}?table={encodeURIComponent(table.label)}&amp;t=…
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() =>
                                  copyTableUrl(table.label, table.qrToken)
                                }
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Copy link
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingId(table.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={deletingId === table.id}
                                onClick={() => handleDeleteTable(table.id)}
                              >
                                {deletingId === table.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
