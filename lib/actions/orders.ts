"use server";

import { revalidatePath } from "next/cache";

import {
  updateBillPaymentStatus,
  updateOrderStatus,
  updateServiceRequestStatus,
} from "@/services/orders.service";
import type { BillPaymentStatus, OrderStatus } from "@/types/order";

export type OrderActionState = { error?: string; success?: string };

export async function updateOrderStatusAction(
  restaurantId: string,
  orderId: string,
  status: OrderStatus,
): Promise<OrderActionState> {
  const result = await updateOrderStatus(restaurantId, orderId, status);

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/orders`);
  return { success: "Order updated" };
}

export async function resolveServiceRequestAction(
  restaurantId: string,
  requestId: string,
  status: "acknowledged" | "resolved",
): Promise<OrderActionState> {
  const result = await updateServiceRequestStatus(
    restaurantId,
    requestId,
    status,
  );

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/orders`);
  return { success: "Request updated" };
}

export async function updateBillPaymentStatusAction(
  restaurantId: string,
  sessionId: string,
  status: BillPaymentStatus,
): Promise<OrderActionState> {
  const result = await updateBillPaymentStatus(restaurantId, sessionId, status);

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/orders`);
  revalidatePath(`/dashboard/${restaurantId}/history`);
  return { success: "Bill updated" };
}
