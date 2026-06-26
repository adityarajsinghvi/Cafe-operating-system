"use client";

import {
  Copy,
  ImagePlus,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";

import {
  createTableAction,
  createTablesBulkAction,
  deleteTableAction,
  updateSettingsAction,
  updateTableAction,
  uploadRestaurantLogoAction,
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
  logoUrl,
  city,
  smartSuggestionsEnabled,
  rewardsEnabled,
  orderingEnabled,
  plan,
  upiId,
  tokenDisplayEnabled,
  tables,
}: {
  restaurantId: string;
  slug: string;
  restaurantName: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  city: string;
  smartSuggestionsEnabled: boolean;
  rewardsEnabled: boolean;
  orderingEnabled: boolean;
  plan: string;
  upiId: string;
  tokenDisplayEnabled: boolean;
  tables: RestaurantTable[];
}) {
  const isMenuPlan = plan === "menu";
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [upiError, setUpiError] = useState<string | null>(null);
  const [tableMessage, setTableMessage] = useState<string | null>(null);
  const [isSavingSettings, startSaveSettings] = useTransition();
  const [isUploadingLogo, startUploadLogo] = useTransition();
  const [isCreatingTable, startCreateTable] = useTransition();
  const [isBulkCreating, startBulkCreate] = useTransition();
  const [isPrinting, setIsPrinting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logo, setLogo] = useState(logoUrl);

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
    setUpiError(null);

    const upi = formData.get("upiId")?.toString().trim() ?? "";
    if (upi && !/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(upi)) {
      setUpiError("Enter a valid UPI ID, e.g. cafename@upi");
      return;
    }

    startSaveSettings(async () => {
      const result = await updateSettingsAction(restaurantId, formData);
      setSettingsMessage(result.error ?? result.success ?? null);
    });
  }

  function handleLogoUpload(file: File) {
    setSettingsMessage(null);

    const formData = new FormData();
    formData.append("logo", file);

    startUploadLogo(async () => {
      const result = await uploadRestaurantLogoAction(restaurantId, formData);
      if (result.logoUrl) setLogo(result.logoUrl);
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
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                  {logo ? (
                    <Image
                      src={logo}
                      alt={restaurantName}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                      {restaurantName.charAt(0)}
                    </div>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40">
                  <ImagePlus className="h-4 w-4" />
                  {isUploadingLogo ? "Uploading…" : "Upload logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingLogo}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Shown on your guest menu next to your restaurant name.
              </p>
            </div>

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
            {!isMenuPlan && (
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
            )}

            {!isMenuPlan && (
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
            )}

            {!isMenuPlan && (
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                <Label htmlFor="upiId" className="flex items-center gap-1.5 font-medium">
                  <IndianRupee className="h-4 w-4" />
                  UPI ID for payment collection
                </Label>
                <Input
                  id="upiId"
                  name="upiId"
                  defaultValue={upiId}
                  placeholder="cafename@upi"
                />
                {upiError ? (
                  <p className="text-xs text-destructive">{upiError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Guests pay via this UPI ID when placing an order. Leave blank to skip
                    online payment and only show a token number.
                  </p>
                )}
              </div>
            )}

            {!isMenuPlan && (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <input
                  type="checkbox"
                  id="tokenDisplayEnabled"
                  name="tokenDisplayEnabled"
                  defaultChecked={tokenDisplayEnabled}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                />
                <div>
                  <Label htmlFor="tokenDisplayEnabled" className="cursor-pointer font-medium">
                    🎫 Token queue display
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Show guests a token number and live queue position after they order.
                  </p>
                </div>
              </div>
            )}

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
                {isMenuPlan ? "Menu QR code" : "Tables & QR codes"}
              </CardTitle>
              <CardDescription>
                {isMenuPlan
                  ? "Print a QR code guests can scan to view your digital menu."
                  : "Create tables, print QR sheets, and share ordering links."}
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
          {isMenuPlan ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your menu is live at{" "}
                <span className="font-mono font-medium">/r/{slug}</span>.
                Print the QR below and place it on your counter so guests can scan and view your menu.
              </p>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={isPrinting}
                onClick={async () => {
                  setIsPrinting(true);
                  try {
                    const url = `${window.location.origin}/r/${slug}`;
                    const { default: QRCode } = await import("qrcode");
                    const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
                    const win = window.open("", "_blank");
                    if (win) {
                      win.document.write(`<html><body style="text-align:center;padding:40px;font-family:sans-serif"><h2>${restaurantName}</h2><img src="${dataUrl}" style="width:260px"/><p style="font-size:12px;color:#666">${url}</p><script>window.print();<\/script></body></html>`);
                      win.document.close();
                    }
                  } finally {
                    setIsPrinting(false);
                  }
                }}
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Print menu QR
              </Button>
            </div>
          ) : (
          <>
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
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
