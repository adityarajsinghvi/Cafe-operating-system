import { NextResponse } from "next/server";

import {
  getCustomerByPhone,
  updateCustomerName,
  upsertCustomer,
} from "@/services/customers.service";
import { getGuestSessionToken } from "@/lib/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionByToken } from "@/services/tables.service";

// GET /api/v1/guest/customer?restaurantId=...&phone=...
// Returns customer info AND links them to the current session so history works.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const phone = searchParams.get("phone");

  if (!restaurantId || !phone || phone.length !== 10) {
    return NextResponse.json({ name: null, id: null });
  }

  // Look up (or create) the customer
  const customer = await getCustomerByPhone(restaurantId, phone);

  // Link customer to the current session so cross-session order history works
  const sessionToken = await getGuestSessionToken();
  if (sessionToken && customer?.id) {
    const admin = createAdminClient();
    if (admin) {
      const session = await getSessionByToken(sessionToken);
      if (session && !session.customerId) {
        await Promise.all([
          // Set customer_id on the session so listGuestSessionOrders finds past orders
          (admin as any)
            .from("table_sessions")
            .update({ customer_id: customer.id })
            .eq("id", session.id),
          // Increment visit_count atomically (see migration 006_increment_customer_visit_fn.sql)
          (admin as any).rpc("increment_customer_visit", { p_customer_id: customer.id }),
        ]);
      }
    }
  }

  return NextResponse.json({ name: customer?.name ?? null, id: customer?.id ?? null });
}

// PATCH /api/v1/guest/customer
// Body: { customerId, name }
// Requires an active session as a lightweight trust check.
export async function PATCH(request: Request) {
  const sessionToken = await getGuestSessionToken();
  if (!sessionToken) {
    return NextResponse.json({ error: "No active session" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const customerId = body?.customerId?.toString();
  const name = body?.name?.toString()?.trim();

  if (!customerId || !name) {
    return NextResponse.json({ error: "customerId and name required" }, { status: 400 });
  }

  const ok = await updateCustomerName(customerId, name);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update name" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
