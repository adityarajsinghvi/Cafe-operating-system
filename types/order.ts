import { z } from "zod";

import type { DietaryType } from "@/types/database";

export const orderStatusSchema = z.enum([
  "pending_payment",
  "pending",
  "confirmed",
  "served",
  "cancelled",
]);

export const serviceRequestTypeSchema = z.enum(["waiter", "water", "bill"]);
export const serviceRequestStatusSchema = z.enum([
  "open",
  "acknowledged",
  "resolved",
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type ServiceRequestType = z.infer<typeof serviceRequestTypeSchema>;
export type ServiceRequestStatus = z.infer<typeof serviceRequestStatusSchema>;

// Flow for table-plan orders (classic sit-down)
export const TABLE_ORDER_STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "served"];
// Flow for cart-plan orders placed through UPI payment
export const CART_ORDER_STATUS_FLOW: OrderStatus[] = ["pending_payment", "confirmed", "served"];
// Kept for backward-compat references that don't need plan awareness
export const ORDER_STATUS_FLOW: OrderStatus[] = TABLE_ORDER_STATUS_FLOW;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  pending: "New",
  confirmed: "Confirmed",
  served: "Served",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  pending_payment: "bg-violet-100 text-violet-900",
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-sky-100 text-sky-900",
  served: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export const SERVICE_REQUEST_LABELS: Record<ServiceRequestType, string> = {
  waiter: "Call waiter",
  water: "Water refill",
  bill: "Request bill",
};

export const GUEST_ORDER_STATUS: Record<
  OrderStatus,
  { label: string; description: string; emoji: string }
> = {
  pending_payment: {
    label: "Pay to confirm",
    description: "Complete your payment to confirm the order",
    emoji: "💳",
  },
  pending: {
    label: "Order sent",
    description: "The kitchen has received your order",
    emoji: "📨",
  },
  confirmed: {
    label: "Confirmed",
    description: "The kitchen is preparing your order",
    emoji: "👨‍🍳",
  },
  served: {
    label: "Served",
    description: "Enjoy your meal!",
    emoji: "🎉",
  },
  cancelled: {
    label: "Cancelled",
    description: "This order was cancelled",
    emoji: "✕",
  },
};

export const GUEST_TRACKABLE_STATUSES: OrderStatus[] = ["pending_payment", "pending", "confirmed"];

export const cartLineSchema = z.object({
  menuItemId: z.string().uuid(),
  name: z.string(),
  priceCents: z.number().int().min(0),
  quantity: z.number().int().min(1).max(99),
  dietaryType: z.string().optional(),
  notes: z.string().optional(),
});

export const submitOrderSchema = z.object({
  items: z.array(cartLineSchema).min(1),
  notes: z.string().max(500).optional(),
});

export type CartLine = z.infer<typeof cartLineSchema>;

export interface OrderItem {
  id: string;
  menuItemId: string | null;
  name: string;
  priceCents: number;
  quantity: number;
  dietaryType: DietaryType | null;
  notes: string | null;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableSessionId: string | null;
  tableLabel: string | null;
  status: OrderStatus;
  notes: string | null;
  subtotalCents: number;
  itemCount: number;
  tokenNumber: number | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  label: string;
  zone: string | null;
  qrToken: string;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  restaurantId: string;
  tableSessionId: string;
  requestType: ServiceRequestType;
  status: ServiceRequestStatus;
  tableLabel: string | null;
  createdAt: string;
}

export type BillPaymentStatus = "unpaid" | "paid";

export interface TableBill {
  sessionId: string;
  tableLabel: string | null;
  paymentStatus: BillPaymentStatus;
  paidAt: string | null;
  totalCents: number;
  itemCount: number;
  orderCount: number;
  orders: Order[];
}

export function formatOrderTotal(cents: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function getNextOrderStatus(
  current: OrderStatus,
): OrderStatus | null {
  if (current === "cancelled" || current === "served") return null;
  // pending_payment → confirmed (skip pending — payment confirmation IS the prep trigger)
  if (current === "pending_payment") return "confirmed";
  const index = TABLE_ORDER_STATUS_FLOW.indexOf(current);
  if (index === -1 || index === TABLE_ORDER_STATUS_FLOW.length - 1) return null;
  return TABLE_ORDER_STATUS_FLOW[index + 1];
}
