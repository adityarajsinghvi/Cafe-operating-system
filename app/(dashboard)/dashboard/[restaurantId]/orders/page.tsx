import { OrderBoard } from "@/components/dashboard/order-board";
import { ServiceRequestPanel } from "@/components/dashboard/service-request-panel";
import { TokenQueueStrip } from "@/components/dashboard/token-queue-strip";
import { getFeatures } from "@/lib/features";
import {
  listOpenServiceRequests,
  listRestaurantOrders,
} from "@/services/orders.service";
import { getRestaurantById } from "@/services/restaurants.service";
import { archiveExpiredTableSessions } from "@/services/tables.service";
import type { OrderStatus } from "@/types/order";

const ACTIVE_STATUSES: OrderStatus[] = ["pending_payment", "pending", "confirmed"];

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  await archiveExpiredTableSessions(restaurantId);

  const [restaurant, orders, serviceRequests] = await Promise.all([
    getRestaurantById(restaurantId),
    listRestaurantOrders(restaurantId, { status: ACTIVE_STATUSES }),
    listOpenServiceRequests(restaurantId),
  ]);

  const features = restaurant ? getFeatures(restaurant) : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4" style={{ background: "#3d3929" }}>
          <h1
            className="text-xl font-black tracking-tight"
            style={{ color: "#faf9f5", fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Live Orders 🧾
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(250,249,245,0.5)" }}>
            Advance each chit through the kitchen in real time
          </p>
        </div>
        <div
          className="border-t border-dashed border-border px-5 py-2.5 text-xs text-muted-foreground"
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent,transparent 23px,rgba(0,0,0,0.03) 23px,rgba(0,0,0,0.03) 24px)",
          }}
        >
          Orders update live — no need to refresh
        </div>
      </div>

      {features?.tokenDisplay && (
        <TokenQueueStrip
          restaurantId={restaurantId}
          initialOrders={orders ?? []}
        />
      )}

      <ServiceRequestPanel
        restaurantId={restaurantId}
        initialRequests={serviceRequests ?? []}
      />

      <OrderBoard
        restaurantId={restaurantId}
        currency={restaurant?.currency ?? "INR"}
        initialOrders={orders ?? []}
      />
    </div>
  );
}
