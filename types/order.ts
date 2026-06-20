import { z } from "zod";

import type { DietaryType } from "@/types/database";

export const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "preparing",
  "ready",
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

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-sky-100 text-sky-900",
  preparing: "bg-violet-100 text-violet-900",
  ready: "bg-emerald-100 text-emerald-900",
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
  pending: {
    label: "Order sent",
    description: "The kitchen has received your order",
    emoji: "📨",
  },
  confirmed: {
    label: "Confirmed",
    description: "Your order is locked in",
    emoji: "✅",
  },
  preparing: {
    label: "Cooking",
    description: "The chef is preparing your food",
    emoji: "👨‍🍳",
  },
  ready: {
    label: "Ready!",
    description: "Your order is on its way to the table",
    emoji: "🔔",
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

export const GUEST_TRACKABLE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
];

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
  const index = ORDER_STATUS_FLOW.indexOf(current);
  if (index === -1 || index === ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[index + 1];
}
