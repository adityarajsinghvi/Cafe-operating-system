import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import type { Restaurant, RestaurantMember } from "@/types/database";

export type RestaurantWithRole = Restaurant & {
  role: RestaurantMember["role"];
};

async function requireAuth() {
  const auth = await createAuthenticatedClient();
  if (!auth) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  return { ...auth, admin };
}

export async function getCurrentUser() {
  const auth = await createAuthenticatedClient();
  return auth?.user ?? null;
}

export async function getUserRestaurants(): Promise<RestaurantWithRole[]> {
  const ctx = await requireAuth();
  if (!ctx) return [];

  const { admin, user } = ctx;

  const { data: memberships, error: membershipError } = await admin
    .from("restaurant_members")
    .select("*")
    .eq("user_id", user.id);

  if (membershipError || !memberships?.length) return [];

  const restaurantIds = memberships.map((membership) => membership.restaurant_id);
  const { data: restaurants, error: restaurantError } = await admin
    .from("restaurants")
    .select("*")
    .in("id", restaurantIds);

  if (restaurantError || !restaurants) return [];

  return restaurants.map((restaurant) => ({
    ...restaurant,
    role: memberships.find(
      (membership) => membership.restaurant_id === restaurant.id,
    )!.role,
  }));
}

export async function getRestaurantById(restaurantId: string) {
  const ctx = await requireAuth();
  if (!ctx) return null;

  const { admin, user } = ctx;

  const { data: membership } = await admin
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return null;

  const { data, error } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function getRestaurantMembership(
  restaurantId: string,
  userId: string,
) {
  const ctx = await requireAuth();
  if (!ctx) return null;

  const { data } = await ctx.admin
    .from("restaurant_members")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}

export async function claimRestaurantOwnership(restaurantId: string) {
  const ctx = await requireAuth();
  if (!ctx) return false;

  const { admin, user } = ctx;

  const { data: existingMembership } = await admin
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) return true;

  const { count } = await admin
    .from("restaurant_members")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  if (count && count > 0) return false;

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) return false;

  const { error } = await admin.from("restaurant_members").insert({
    restaurant_id: restaurantId,
    user_id: user.id,
    role: "owner",
  });

  return !error;
}

export async function createRestaurantForUser(name: string, slug: string) {
  const ctx = await requireAuth();
  if (!ctx) {
    return { error: "You must be signed in to create a restaurant" as const };
  }

  const { admin, user } = ctx;

  const { data: restaurant, error } = await admin
    .from("restaurants")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "This URL slug is already taken. Try another." as const };
    }
    return { error: error.message };
  }

  const { error: membershipError } = await admin
    .from("restaurant_members")
    .insert({
      restaurant_id: restaurant.id,
      user_id: user.id,
      role: "owner",
    });

  if (membershipError) {
    return { error: "Restaurant created but access could not be assigned." };
  }

  return { id: restaurant.id };
}

export function isAdminClientConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
