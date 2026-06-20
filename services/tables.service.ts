import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import type { RestaurantTable } from "@/types/order";

async function requireRestaurantAccess(restaurantId: string) {
  const auth = await createAuthenticatedClient();
  const admin = createAdminClient();

  if (!auth || !admin) return null;

  const { data: membership } = await admin
    .from("restaurant_members")
    .select("id, role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!membership) return null;

  return { admin, user: auth.user, role: membership.role };
}

function mapTable(row: {
  id: string;
  restaurant_id: string;
  label: string;
  zone: string | null;
  qr_token: string;
  is_active: boolean;
  created_at: string;
}): RestaurantTable {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    label: row.label,
    zone: row.zone,
    qrToken: row.qr_token,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function listRestaurantTables(restaurantId: string) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return null;

  const { data, error } = await ctx.admin
    .from("restaurant_tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("label");

  if (error) return null;

  return (data ?? []).map(mapTable);
}

export async function createRestaurantTable(
  restaurantId: string,
  input: { label: string; zone?: string },
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  if (!["owner", "manager"].includes(ctx.role)) {
    return { error: "Only owners and managers can manage tables" };
  }

  const label = input.label.trim();
  if (!label) return { error: "Table label is required" };

  const { data, error } = await ctx.admin
    .from("restaurant_tables")
    .insert({
      restaurant_id: restaurantId,
      label,
      zone: input.zone?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A table with this label already exists" };
    }
    return { error: error.message };
  }

  return { table: mapTable(data) };
}

export async function deleteRestaurantTable(
  restaurantId: string,
  tableId: string,
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  if (!["owner", "manager"].includes(ctx.role)) {
    return { error: "Only owners and managers can manage tables" };
  }

  const { error } = await ctx.admin
    .from("restaurant_tables")
    .delete()
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  return { success: true as const };
}

export async function updateRestaurantTable(
  restaurantId: string,
  tableId: string,
  input: { label?: string; zone?: string | null; isActive?: boolean },
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  if (!["owner", "manager"].includes(ctx.role)) {
    return { error: "Only owners and managers can manage tables" };
  }

  const patch: {
    label?: string;
    zone?: string | null;
    is_active?: boolean;
  } = {};

  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label) return { error: "Table label is required" };
    patch.label = label;
  }
  if (input.zone !== undefined) patch.zone = input.zone?.trim() || null;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await ctx.admin
    .from("restaurant_tables")
    .update(patch)
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A table with this label already exists" };
    }
    return { error: error.message };
  }

  return { table: mapTable(data) };
}

export async function createRestaurantTablesBulk(
  restaurantId: string,
  input: {
    prefix: string;
    from: number;
    to: number;
    zone?: string;
  },
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  if (!["owner", "manager"].includes(ctx.role)) {
    return { error: "Only owners and managers can manage tables" };
  }

  const prefix = input.prefix.trim();
  if (!prefix) return { error: "Table prefix is required" };

  const from = Math.max(1, input.from);
  const to = Math.max(from, input.to);
  if (to - from + 1 > 50) {
    return { error: "You can create at most 50 tables at once" };
  }

  const rows = Array.from({ length: to - from + 1 }, (_, index) => ({
    restaurant_id: restaurantId,
    label: `${prefix}${from + index}`,
    zone: input.zone?.trim() || null,
  }));

  const { data, error } = await ctx.admin
    .from("restaurant_tables")
    .insert(rows)
    .select("*");

  if (error) {
    if (error.code === "23505") {
      return { error: "One or more table labels already exist" };
    }
    return { error: error.message };
  }

  return { tables: (data ?? []).map(mapTable), count: data?.length ?? 0 };
}

export async function archiveExpiredTableSessions(restaurantId: string) {
  const admin = createAdminClient();
  if (!admin) return;

  await admin
    .from("table_sessions")
    .update({ closed_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId)
    .is("closed_at", null)
    .lt("expires_at", new Date().toISOString());
}

export async function getTableByQrToken(qrToken: string) {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("restaurant_tables")
    .select("*")
    .eq("qr_token", qrToken)
    .eq("is_active", true)
    .maybeSingle();

  return data ? mapTable(data) : null;
}

export async function createGuestSession({
  restaurantId,
  tableToken,
}: {
  restaurantId: string;
  tableToken?: string;
}): Promise<
  | { error: string }
  | {
      sessionToken: string;
      expiresAt: string;
      tableLabel: string | null;
      tableId: string | null;
    }
> {
  const admin = createAdminClient();
  if (!admin) return { error: "Server configuration error" as const };

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, onboarding_completed, status")
    .eq("id", restaurantId)
    .maybeSingle();

  if (
    !restaurant ||
    !restaurant.onboarding_completed ||
    restaurant.status === "suspended"
  ) {
    return { error: "Restaurant not available" };
  }

  let tableId: string | null = null;
  let tableLabel: string | null = null;

  if (tableToken) {
    const table = await getTableByQrToken(tableToken);
    if (!table || table.restaurantId !== restaurantId) {
      return { error: "Invalid table QR code" };
    }
    tableId = table.id;
    tableLabel = table.label;
  }

  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  const { data: session, error } = await admin
    .from("table_sessions")
    .insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      expires_at: expiresAt,
    })
    .select("session_token, expires_at")
    .single();

  if (error || !session) {
    return { error: error?.message ?? "Failed to create session" };
  }

  return {
    sessionToken: session.session_token,
    expiresAt: session.expires_at,
    tableLabel,
    tableId,
  };
}

export async function resolveGuestSession({
  restaurantId,
  tableToken,
  existingSessionToken,
}: {
  restaurantId: string;
  tableToken?: string;
  existingSessionToken?: string;
}): Promise<
  | { error: string }
  | {
      sessionToken: string;
      expiresAt: string;
      tableLabel: string | null;
      tableId: string | null;
      resumed: boolean;
    }
> {
  let targetTableId: string | null = null;
  let targetTableLabel: string | null = null;

  if (tableToken) {
    const table = await getTableByQrToken(tableToken);
    if (!table || table.restaurantId !== restaurantId) {
      return { error: "Invalid table QR code" };
    }
    targetTableId = table.id;
    targetTableLabel = table.label;
  }

  if (existingSessionToken) {
    const existing = await getSessionByToken(existingSessionToken);
    if (existing && existing.restaurantId === restaurantId) {
      const existingTableId = existing.tableId ?? null;
      if (existingTableId === targetTableId) {
        return {
          sessionToken: existingSessionToken,
          expiresAt: existing.expiresAt,
          tableLabel: existing.tableLabel,
          tableId: existing.tableId,
          resumed: true,
        };
      }
    }
  }

  const created = await createGuestSession({ restaurantId, tableToken });
  if ("error" in created) {
    return created;
  }

  return {
    ...created,
    tableId: targetTableId,
    resumed: false,
  };
}

export async function getSessionByToken(sessionToken: string) {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: session } = await admin
    .from("table_sessions")
    .select("id, restaurant_id, expires_at, table_id, customer_id, bill_payment_status, bill_paid_at, closed_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (!session) return null;

  if (session.closed_at) return null;
  if (new Date(session.expires_at) < new Date()) return null;

  let tableLabel: string | null = null;

  if (session.table_id) {
    const { data: table } = await admin
      .from("restaurant_tables")
      .select("label")
      .eq("id", session.table_id)
      .maybeSingle();

    tableLabel = table?.label ?? null;
  }

  return {
    id: session.id,
    restaurantId: session.restaurant_id,
    tableId: session.table_id,
    customerId: session.customer_id ?? null,
    tableLabel,
    expiresAt: session.expires_at,
    billPaymentStatus: session.bill_payment_status,
    billPaidAt: session.bill_paid_at,
  };
}