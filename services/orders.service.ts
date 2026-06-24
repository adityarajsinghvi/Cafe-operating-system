import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import { getSessionByToken } from "@/services/tables.service";
import { upsertCustomer } from "@/services/customers.service";
import type { Order, OrderItem, OrderStatus, ServiceRequest, TableBill, BillPaymentStatus } from "@/types/order";
import { submitOrderSchema } from "@/types/order";

async function requireRestaurantAccess(restaurantId: string) {
  const auth = await createAuthenticatedClient();
  const admin = createAdminClient();

  if (!auth || !admin) return null;

  const { data: membership } = await admin
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!membership) return null;

  return { admin, user: auth.user };
}

function mapOrderItem(row: {
  id: string;
  menu_item_id: string | null;
  name: string;
  price_cents: number;
  quantity: number;
  dietary_type: OrderItem["dietaryType"];
  notes: string | null;
}): OrderItem {
  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    name: row.name,
    priceCents: row.price_cents,
    quantity: row.quantity,
    dietaryType: row.dietary_type,
    notes: row.notes,
  };
}

function mapOrder(
  row: {
    id: string;
    restaurant_id: string;
    table_session_id: string | null;
    table_label: string | null;
    status: OrderStatus;
    notes: string | null;
    subtotal_cents: number;
    item_count: number;
    token_number?: number | null;
    created_at: string;
    updated_at: string;
  },
  items: OrderItem[],
): Order {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    tableSessionId: row.table_session_id,
    tableLabel: row.table_label,
    status: row.status,
    notes: row.notes,
    subtotalCents: row.subtotal_cents,
    itemCount: row.item_count,
    tokenNumber: row.token_number ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

export async function createGuestOrder(
  sessionToken: string,
  payload: unknown,
  identity?: { phone: string; name: string },
) {
  const admin = createAdminClient();
  if (!admin) return { error: "Server configuration error" as const };

  const session = await getSessionByToken(sessionToken);
  if (!session) return { error: "Session expired. Please scan the table QR again." };

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("ordering_enabled, upi_id, token_display_enabled")
    .eq("id", session.restaurantId)
    .maybeSingle();

  if (restaurant && (restaurant as { ordering_enabled?: boolean }).ordering_enabled === false) {
    return { error: "Ordering is currently unavailable" };
  }

  const upiId: string | null = (restaurant as { upi_id?: string | null } | null)?.upi_id ?? null;
  const tokenDisplayEnabled: boolean =
    (restaurant as { token_display_enabled?: boolean } | null)?.token_display_enabled ?? false;
  const needsToken = Boolean(upiId) || tokenDisplayEnabled;

  const parsed = submitOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Invalid order data" };
  }

  // Resolve customer identity (non-blocking — order still placed if this fails)
  let customerId: string | null = null;
  if (identity?.phone) {
    const customer = await upsertCustomer(
      session.restaurantId,
      identity.phone,
      identity.name || undefined,
    );
    if (customer) {
      customerId = customer.id;
      // Link customer to the session so future lookups don't need the phone
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from("table_sessions")
        .update({ customer_id: customer.id })
        .eq("id", session.id)
        .is("customer_id", null); // only set once
    }
  }

  const menuItemIds = parsed.data.items.map((item) => item.menuItemId);

  const { data: menuItems, error: menuError } = await admin
    .from("menu_items")
    .select("id, name, price_cents, dietary_type, is_available")
    .eq("restaurant_id", session.restaurantId)
    .in("id", menuItemIds);

  if (menuError || !menuItems?.length) {
    return { error: "Menu items not found" };
  }

  const menuMap = new Map(menuItems.map((item) => [item.id, item]));

  let subtotalCents = 0;
  let itemCount = 0;
  const orderItems: {
    menu_item_id: string;
    name: string;
    price_cents: number;
    quantity: number;
    dietary_type: OrderItem["dietaryType"];
    notes: string | null;
  }[] = [];

  for (const line of parsed.data.items) {
    const menuItem = menuMap.get(line.menuItemId);
    if (!menuItem || !menuItem.is_available) {
      return { error: `"${line.name}" is no longer available` };
    }

    const lineTotal = menuItem.price_cents * line.quantity;
    subtotalCents += lineTotal;
    itemCount += line.quantity;

    orderItems.push({
      menu_item_id: menuItem.id,
      name: menuItem.name,
      price_cents: menuItem.price_cents,
      quantity: line.quantity,
      dietary_type: menuItem.dietary_type,
      notes: line.notes ?? null,
    });
  }

  // Generate next token for today if required
  let tokenNumber: number | null = null;
  if (needsToken) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: lastToken } = await admin
      .from("orders")
      .select("token_number")
      .eq("restaurant_id", session.restaurantId)
      .gte("created_at", todayStart.toISOString())
      .not("token_number", "is", null)
      .order("token_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    tokenNumber = ((lastToken as { token_number?: number | null } | null)?.token_number ?? 0) + 1;
  }

  const initialStatus = upiId ? ("pending_payment" as const) : ("pending" as const);

  const orderInsertData = {
    restaurant_id: session.restaurantId,
    table_session_id: session.id,
    table_label: session.tableLabel,
    notes: parsed.data.notes ?? null,
    subtotal_cents: subtotalCents,
    item_count: itemCount,
    status: initialStatus,
    ...(tokenNumber !== null ? { token_number: tokenNumber } : {}),
    ...(customerId ? { customer_id: customerId } : {}),
  };

  // Cast needed until Supabase types are regenerated with the new customer_id column
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (admin as any)
    .from("orders")
    .insert(orderInsertData)
    .select("*")
    .single();

  if (orderError || !order) {
    return { error: orderError?.message ?? "Failed to place order" };
  }

  const { error: itemsError } = await admin.from("order_items").insert(
    orderItems.map((item) => ({
      order_id: order.id,
      ...item,
    })),
  );

  if (itemsError) {
    await admin.from("orders").delete().eq("id", order.id);
    return { error: itemsError.message };
  }

  return {
    order: mapOrder(
      order,
      orderItems.map((item, index) =>
        mapOrderItem({
          id: `temp-${index}`,
          menu_item_id: item.menu_item_id,
          name: item.name,
          price_cents: item.price_cents,
          quantity: item.quantity,
          dietary_type: item.dietary_type,
          notes: item.notes,
        }),
      ),
    ),
  };
}

export async function cancelExpiredPendingPaymentOrders(restaurantId: string) {
  const admin = createAdminClient();
  if (!admin) return;
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await admin
    .from("orders")
    .update({ status: "cancelled" })
    .eq("restaurant_id", restaurantId)
    .eq("status", "pending_payment")
    .lt("created_at", cutoff);
}

export async function listGuestSessionOrders(sessionToken: string) {
  const admin = createAdminClient();
  if (!admin) return { error: "Server configuration error" as const };

  const session = await getSessionByToken(sessionToken);
  if (!session) return { error: "Session expired" as const };

  // Auto-cancel stale pending_payment orders before fetching
  await cancelExpiredPendingPaymentOrders(session.restaurantId);

  // Fetch current session orders + historical orders if customer is known
  let orderQuery = admin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (session.customerId) {
    // Include orders from all sessions for this customer (across visits)
    orderQuery = orderQuery.or(
      `table_session_id.eq.${session.id},customer_id.eq.${session.customerId}`,
    );
  } else {
    orderQuery = orderQuery.eq("table_session_id", session.id);
  }

  const { data: orders, error } = await orderQuery;

  if (error) return { error: error.message };
  if (!orders?.length) {
    return {
      orders: [] as Order[],
      billPaymentStatus: session.billPaymentStatus,
    };
  }

  const orderIds = orders.map((order) => order.id);

  const { data: allItems } = await admin
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  const itemsByOrder = new Map<string, OrderItem[]>();

  for (const item of allItems ?? []) {
    const mapped = mapOrderItem(item);
    const existing = itemsByOrder.get(item.order_id) ?? [];
    existing.push(mapped);
    itemsByOrder.set(item.order_id, existing);
  }

  // Count how many confirmed/pending orders exist in this restaurant ahead of the guest
  const { count: queueAhead } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", session.restaurantId)
    .in("status", ["pending", "confirmed"]);

  return {
    orders: orders.map((order) =>
      mapOrder(order, itemsByOrder.get(order.id) ?? []),
    ),
    billPaymentStatus: session.billPaymentStatus,
    queueAhead: queueAhead ?? 0,
  };
}

export async function listRestaurantOrders(
  restaurantId: string,
  options?: { status?: OrderStatus[]; limit?: number },
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return null;

  // Auto-cancel stale pending_payment orders on every board load
  await cancelExpiredPendingPaymentOrders(restaurantId);

  let query = ctx.admin
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.status?.length) {
    query = query.in("status", options.status);
  }

  const { data: orders, error } = await query;

  if (error || !orders?.length) {
    return orders?.length === 0 ? [] : null;
  }

  const orderIds = orders.map((order) => order.id);

  const { data: allItems } = await ctx.admin
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  const itemsByOrder = new Map<string, OrderItem[]>();

  for (const item of allItems ?? []) {
    const mapped = mapOrderItem(item);
    const existing = itemsByOrder.get(item.order_id) ?? [];
    existing.push(mapped);
    itemsByOrder.set(item.order_id, existing);
  }

  return orders.map((order) =>
    mapOrder(order, itemsByOrder.get(order.id) ?? []),
  );
}

export async function updateOrderStatus(
  restaurantId: string,
  orderId: string,
  status: OrderStatus,
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  const { data, error } = await ctx.admin
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Order not found" };

  if (status === "served" && data.table_session_id) {
    await ctx.admin
      .from("table_sessions")
      .update({
        bill_payment_status: "unpaid",
        bill_paid_at: null,
      })
      .eq("id", data.table_session_id);
  }

  const { data: items } = await ctx.admin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  // Award loyalty once order is served (idempotent — guarded in DB function)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderData = data as any;
  if (status === "served" && orderData.customer_id && orderData.table_session_id) {
    const itemNames = (items ?? []).map((i: { name: string }) => i.name);
    (ctx.admin as any)
      .from("restaurants")
      .select("loyalty_points_per_order")
      .eq("id", restaurantId)
      .single()
      .then(({ data: rest }: { data: { loyalty_points_per_order: number } | null }) => {
        const pts = rest?.loyalty_points_per_order ?? 10;
        return (ctx.admin as any).rpc("serve_order_loyalty", {
          p_order_id: orderData.id,
          p_customer_id: orderData.customer_id,
          p_session_id: orderData.table_session_id,
          p_order_cents: orderData.subtotal_cents,
          p_points: pts,
          p_item_names: itemNames,
        });
      })
      .catch(() => {}); // loyalty failure must never fail the status update
  }

  return {
    order: mapOrder(data, (items ?? []).map(mapOrderItem)),
  };
}

export async function createServiceRequest(
  sessionToken: string,
  requestType: "waiter" | "water" | "bill",
) {
  const admin = createAdminClient();
  if (!admin) return { error: "Server configuration error" as const };

  const session = await getSessionByToken(sessionToken);
  if (!session) return { error: "Session expired" };

  const { data, error } = await admin
    .from("service_requests")
    .insert({
      restaurant_id: session.restaurantId,
      table_session_id: session.id,
      request_type: requestType,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to send request" };
  }

  return {
    request: {
      id: data.id,
      restaurantId: data.restaurant_id,
      tableSessionId: data.table_session_id,
      requestType: data.request_type,
      status: data.status,
      tableLabel: session.tableLabel,
      createdAt: data.created_at,
    } satisfies ServiceRequest,
  };
}

export async function listOpenServiceRequests(restaurantId: string) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return null;

  const { data, error } = await ctx.admin
    .from("service_requests")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .in("status", ["open", "acknowledged"])
    .order("created_at", { ascending: true });

  if (error || !data) return null;

  const sessionIds = [...new Set(data.map((row) => row.table_session_id))];

  const { data: sessions } = await ctx.admin
    .from("table_sessions")
    .select("id, table_id")
    .in("id", sessionIds);

  const tableIds = (sessions ?? [])
    .map((session) => session.table_id)
    .filter((id): id is string => Boolean(id));

  const { data: tables } = tableIds.length
    ? await ctx.admin
        .from("restaurant_tables")
        .select("id, label")
        .in("id", tableIds)
    : { data: [] as { id: string; label: string }[] };

  const tableLabelById = new Map(
    (tables ?? []).map((table) => [table.id, table.label]),
  );
  const sessionTableMap = new Map(
    (sessions ?? []).map((session) => [session.id, session.table_id]),
  );

  return data.map((row) => {
    const tableId = sessionTableMap.get(row.table_session_id);

    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      tableSessionId: row.table_session_id,
      requestType: row.request_type,
      status: row.status,
      tableLabel: tableId ? (tableLabelById.get(tableId) ?? null) : null,
      createdAt: row.created_at,
    } satisfies ServiceRequest;
  });
}

export async function updateServiceRequestStatus(
  restaurantId: string,
  requestId: string,
  status: "acknowledged" | "resolved",
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  const { error } = await ctx.admin
    .from("service_requests")
    .update({ status })
    .eq("id", requestId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  return { success: true as const };
}

export async function getActiveOrderCounts(restaurantId: string) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return null;

  const activeStatuses: OrderStatus[] = ["pending_payment", "pending", "confirmed"];

  const { count } = await ctx.admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .in("status", activeStatuses);

  return { activeCount: count ?? 0 };
}

export async function listRestaurantBills(
  restaurantId: string,
  options?: { paymentStatus?: BillPaymentStatus },
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return null;

  const { data: orders, error } = await ctx.admin
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "served")
    .order("created_at", { ascending: true });

  if (error) return null;
  if (!orders?.length) return [] as TableBill[];

  const sessionIds = [
    ...new Set(
      orders
        .map((order) => order.table_session_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: sessions } = await ctx.admin
    .from("table_sessions")
    .select("id, table_id, bill_payment_status, bill_paid_at")
    .in("id", sessionIds);

  const tableIds = (sessions ?? [])
    .map((session) => session.table_id)
    .filter((id): id is string => Boolean(id));

  const { data: tables } = tableIds.length
    ? await ctx.admin
        .from("restaurant_tables")
        .select("id, label")
        .in("id", tableIds)
    : { data: [] as { id: string; label: string }[] };

  const tableLabelById = new Map(
    (tables ?? []).map((table) => [table.id, table.label]),
  );
  const sessionMap = new Map(
    (sessions ?? []).map((session) => [session.id, session]),
  );

  const orderIds = orders.map((order) => order.id);
  const { data: allItems } = await ctx.admin
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of allItems ?? []) {
    const mapped = mapOrderItem(item);
    const existing = itemsByOrder.get(item.order_id) ?? [];
    existing.push(mapped);
    itemsByOrder.set(item.order_id, existing);
  }

  const billsBySession = new Map<string, TableBill>();

  for (const order of orders) {
    if (!order.table_session_id) continue;

    const session = sessionMap.get(order.table_session_id);
    const tableId = session?.table_id ?? null;
    const mappedOrder = mapOrder(order, itemsByOrder.get(order.id) ?? []);

    const existing = billsBySession.get(order.table_session_id);
    if (existing) {
      existing.orders.push(mappedOrder);
      existing.totalCents += order.subtotal_cents;
      existing.itemCount += order.item_count;
      existing.orderCount += 1;
      continue;
    }

    billsBySession.set(order.table_session_id, {
      sessionId: order.table_session_id,
      tableLabel:
        (tableId ? tableLabelById.get(tableId) : null) ??
        order.table_label,
      paymentStatus:
        (session?.bill_payment_status as BillPaymentStatus | null) ?? "unpaid",
      paidAt: session?.bill_paid_at ?? null,
      totalCents: order.subtotal_cents,
      itemCount: order.item_count,
      orderCount: 1,
      orders: [mappedOrder],
    });
  }

  return [...billsBySession.values()]
    .filter((bill) => {
      if (!options?.paymentStatus) return true;
      return bill.paymentStatus === options.paymentStatus;
    })
    .sort((a, b) => {
      const aDate =
        options?.paymentStatus === "paid" && a.paidAt
          ? new Date(a.paidAt).getTime()
          : new Date(a.orders[a.orders.length - 1].createdAt).getTime();
      const bDate =
        options?.paymentStatus === "paid" && b.paidAt
          ? new Date(b.paidAt).getTime()
          : new Date(b.orders[b.orders.length - 1].createdAt).getTime();
      return bDate - aDate;
    });
}

export async function updateBillPaymentStatus(
  restaurantId: string,
  sessionId: string,
  status: BillPaymentStatus,
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  const { data: session } = await ctx.admin
    .from("table_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!session) return { error: "Bill not found" };

  const { error } = await ctx.admin
    .from("table_sessions")
    .update({
      bill_payment_status: status,
      bill_paid_at: status === "paid" ? new Date().toISOString() : null,
      closed_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", sessionId);

  if (error) return { error: error.message };
  return { success: true as const };
}
