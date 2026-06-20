import { listRestaurantOrders } from "@/services/orders.service";
import { getRestaurantById } from "@/services/restaurants.service";
import { formatMenuPrice } from "@/types/guest";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const [restaurant, orders] = await Promise.all([
    getRestaurantById(restaurantId),
    listRestaurantOrders(restaurantId, {
      status: ["served", "cancelled"],
      limit: 200,
    }),
  ]);

  const currency = restaurant?.currency ?? "INR";

  const totalRevenue = (orders ?? [])
    .filter((o) => o.status === "served")
    .reduce((sum, o) => sum + o.subtotalCents, 0);
  const servedCount = (orders ?? []).filter((o) => o.status === "served").length;
  const cancelledCount = (orders ?? []).filter((o) => o.status === "cancelled").length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Chit header */}
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4" style={{ background: "#3d3929" }}>
          <h1
            className="text-xl font-black tracking-tight"
            style={{ color: "#faf9f5", fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Order History 📜
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(250,249,245,0.5)" }}>
            Completed and cancelled chits
          </p>
        </div>
        {/* Stats strip */}
        <div
          className="flex flex-wrap divide-x divide-dashed divide-border"
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent,transparent 23px,rgba(0,0,0,0.03) 23px,rgba(0,0,0,0.03) 24px)",
          }}
        >
          {[
            { label: "Served", value: servedCount, color: "#16a34a" },
            { label: "Cancelled", value: cancelledCount, color: "#dc2626" },
            { label: "Revenue", value: formatMenuPrice(totalRevenue, currency), color: "#c96442" },
          ].map((s) => (
            <div key={s.label} className="flex-1 px-5 py-3 text-center">
              <p className="text-base font-black" style={{ color: s.color, fontFamily: "Georgia, serif" }}>
                {s.value}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {!orders?.length ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-4xl mb-2">📜</p>
          <p className="font-bold text-foreground" style={{ fontFamily: "Georgia, serif" }}>
            No completed orders yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Completed and cancelled orders will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isServed = order.status === "served";
            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                {/* Mini chit header */}
                <div
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                  style={{ background: isServed ? "#3d3929" : "#4a1515" }}
                >
                  <p
                    className="text-sm font-bold"
                    style={{ color: "#faf9f5", fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {order.tableLabel ? `Table ${order.tableLabel}` : "Walk-in"}
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-bold"
                      style={
                        isServed
                          ? { background: "#f0fdf4", color: "#166534" }
                          : { background: "#fef2f2", color: "#991b1b" }
                      }
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: isServed ? "#16a34a" : "#dc2626" }}
                      />
                      {isServed ? "SERVED" : "CANCELLED"}
                    </span>
                    <span
                      className="text-sm font-black"
                      style={{ color: "#faf9f5", fontFamily: "Georgia, serif" }}
                    >
                      {formatMenuPrice(order.subtotalCents, currency)}
                    </span>
                  </div>
                </div>

                {/* Paper body */}
                <div
                  className="px-4 py-3"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(transparent,transparent 23px,rgba(0,0,0,0.03) 23px,rgba(0,0,0,0.03) 24px)",
                  }}
                >
                  <p className="mb-2 text-[10px] font-semibold text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>
                  {order.items.length > 0 && (
                    <ul className="space-y-1">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span
                            className="text-foreground"
                            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                          >
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground mr-1.5">
                              {item.quantity}
                            </span>
                            {item.name}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatMenuPrice(item.priceCents * item.quantity, currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
