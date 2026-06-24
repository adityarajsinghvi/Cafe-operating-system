import { createAdminClient } from "@/lib/supabase/admin";

export interface RewardsQuickStats {
  totalCustomers: number;
  totalStamps: number;
  totalRedemptions: number;
}

export async function getRewardsQuickStats(
  restaurantId: string,
): Promise<RewardsQuickStats> {
  const admin = createAdminClient();
  if (!admin) return { totalCustomers: 0, totalStamps: 0, totalRedemptions: 0 };

  const { data } = await (admin as any)
    .from("customers")
    .select("visit_count, redemptions_count")
    .eq("restaurant_id", restaurantId) as {
      data: Array<{ visit_count: number; redemptions_count: number }> | null;
    };

  const rows = data ?? [];
  return {
    totalCustomers: rows.length,
    totalStamps: rows.reduce((s, r) => s + r.visit_count, 0),
    totalRedemptions: rows.reduce((s, r) => s + r.redemptions_count, 0),
  };
}

export interface Customer {
  id: string;
  restaurantId: string;
  phone: string;
  name: string | null;
  createdAt: string;
}

// Raw DB row shape — mirrors the migration until Supabase types are regenerated
interface CustomerRow {
  id: string;
  restaurant_id: string;
  phone: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    phone: row.phone,
    name: row.name,
    createdAt: row.created_at,
  };
}

/** Find or create a customer by (restaurantId, phone). Name is set on first creation only. */
export async function upsertCustomer(
  restaurantId: string,
  phone: string,
  name?: string,
): Promise<Customer | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = admin as any;

  const { data: existing } = await supabase
    .from("customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("phone", phone)
    .maybeSingle() as { data: CustomerRow | null };

  if (existing) {
    if (name && !existing.name) {
      const { data: updated } = await supabase
        .from("customers")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("*")
        .single() as { data: CustomerRow | null };
      return updated ? mapCustomer(updated) : mapCustomer(existing);
    }
    return mapCustomer(existing);
  }

  const { data: created } = await supabase
    .from("customers")
    .insert({ restaurant_id: restaurantId, phone, name: name ?? null })
    .select("*")
    .single() as { data: CustomerRow | null };

  return created ? mapCustomer(created) : null;
}

/** Look up a customer by phone for welcome-back personalisation. */
export async function getCustomerByPhone(
  restaurantId: string,
  phone: string,
): Promise<{ id: string; name: string | null } | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("customers")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .eq("phone", phone)
    .maybeSingle() as { data: { id: string; name: string | null } | null };

  return data ?? null;
}

export interface CustomerSummary {
  id: string;
  phone: string;
  name: string | null;
  visitCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  tasteProfile: { top_items: string[]; avg_spend: number } | null;
  lastVisitAt: string | null;
}

/** List all customers for a restaurant, ordered by most recent visit. */
export async function listRestaurantCustomers(
  restaurantId: string,
): Promise<CustomerSummary[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await (admin as any)
    .from("customers")
    .select("id, phone, name, visit_count, total_spent, loyalty_points, taste_profile, last_visit_at")
    .eq("restaurant_id", restaurantId)
    .order("last_visit_at", { ascending: false, nullsFirst: false })
    .limit(500) as {
      data: Array<{
        id: string;
        phone: string;
        name: string | null;
        visit_count: number;
        total_spent: number;
        loyalty_points: number;
        taste_profile: { top_items: string[]; avg_spend: number } | null;
        last_visit_at: string | null;
      }> | null;
    };

  return (data ?? []).map((row) => ({
    id: row.id,
    phone: row.phone,
    name: row.name,
    visitCount: row.visit_count,
    totalSpent: row.total_spent,
    loyaltyPoints: row.loyalty_points,
    tasteProfile: row.taste_profile,
    lastVisitAt: row.last_visit_at,
  }));
}

/** Set or update the name on an existing customer record. */
export async function updateCustomerName(
  customerId: string,
  name: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("customers")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", customerId);

  return !error;
}
