"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";

import type { CartLine, Order, BillPaymentStatus } from "@/types/order";
import { GUEST_TRACKABLE_STATUSES } from "@/types/order";
import type { GuestMenuItem } from "@/types/guest";

interface GuestCartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  tableLabel: string | null;
  sessionReady: boolean;
  orderingEnabled: boolean;
  serviceRequestsEnabled: boolean;
  loyaltyEnabled: boolean;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  activeOrders: Order[];
  focusOrder: Order | null;
  focusOrderId: string | null;
  setFocusOrderId: (id: string | null) => void;
  trackerOpen: boolean;
  setTrackerOpen: (open: boolean) => void;
  activeOrderCount: number;
  servedOrders: Order[];
  sessionBillCents: number;
  hasSessionBill: boolean;
  billPaymentStatus: BillPaymentStatus | null;
  // Customer identity
  customerPhone: string | null;
  customerName: string | null;
  customerId: string | null;
  saveIdentity: (phone: string, name: string) => Promise<void>;
  addItem: (item: GuestMenuItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateLineNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  placeOrder: (
    notes?: string,
    identity?: { phone: string; name: string },
  ) => Promise<{ error?: string; orderId?: string }>;
  requestService: (
    type: "waiter" | "water" | "bill",
  ) => Promise<{ error?: string }>;
  refreshOrders: () => Promise<void>;
}

const GuestCartContext = createContext<GuestCartContextValue | null>(null);

function cartStorageKey(restaurantId: string, tableToken?: string) {
  return `parcha-cart-${restaurantId}-${tableToken ?? "walk-in"}`;
}

function phoneStorageKey(restaurantId: string) {
  return `parcha-phone-${restaurantId}`;
}

function customerStorageKey(restaurantId: string) {
  return `parcha-customer-${restaurantId}`;
}

export function GuestCartProvider({
  restaurantId,
  slug,
  tableToken,
  orderingEnabled = true,
  serviceRequestsEnabled = false,
  loyaltyEnabled = false,
  children,
}: {
  restaurantId: string;
  slug: string;
  tableToken?: string;
  orderingEnabled?: boolean;
  serviceRequestsEnabled?: boolean;
  loyaltyEnabled?: boolean;
  children: ReactNode;
}) {
  const cartKey = cartStorageKey(restaurantId, tableToken);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [tableLabel, setTableLabel] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [focusOrderId, setFocusOrderId] = useState<string | null>(null);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [billPaymentStatus, setBillPaymentStatus] =
    useState<BillPaymentStatus | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestRestaurantId, setGuestRestaurantId] = useState<string | null>(null);
  const realtimeConnectedRef = useRef(false);
  const previousStatusRef = useRef<Record<string, string>>({});

  // Customer identity — persisted in localStorage keyed by restaurantId
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const focusOrder = useMemo(
    () => activeOrders.find((order) => order.id === focusOrderId) ?? null,
    [activeOrders, focusOrderId],
  );

  const activeOrderCount = useMemo(
    () =>
      activeOrders.filter((order) =>
        GUEST_TRACKABLE_STATUSES.includes(order.status),
      ).length,
    [activeOrders],
  );

  const servedOrders = useMemo(
    () => activeOrders.filter((order) => order.status === "served"),
    [activeOrders],
  );

  const sessionBillCents = useMemo(
    () => servedOrders.reduce((total, order) => total + order.subtotalCents, 0),
    [servedOrders],
  );

  const hasSessionBill = servedOrders.length > 0;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(cartKey);
      setLines(stored ? JSON.parse(stored) : []);
    } catch {
      setLines([]);
    }
  }, [cartKey]);

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(lines));
  }, [lines, cartKey]);

  // Load stored phone on mount and fetch customer profile
  useEffect(() => {
    try {
      const storedPhone = localStorage.getItem(phoneStorageKey(restaurantId));
      const storedCustomer = localStorage.getItem(customerStorageKey(restaurantId));
      if (storedPhone) {
        setCustomerPhone(storedPhone);
        if (storedCustomer) {
          const parsed = JSON.parse(storedCustomer) as { name: string | null; id: string | null };
          setCustomerName(parsed.name);
          setCustomerId(parsed.id);
        } else {
          // Fetch from server (new device, known phone)
          fetch(`/api/v1/guest/customer?restaurantId=${restaurantId}&phone=${storedPhone}`)
            .then((r) => r.json())
            .then((data) => {
              setCustomerName(data.name ?? null);
              setCustomerId(data.id ?? null);
              localStorage.setItem(
                customerStorageKey(restaurantId),
                JSON.stringify({ name: data.name ?? null, id: data.id ?? null }),
              );
            })
            .catch(() => {});
        }
      }
    } catch {}
  }, [restaurantId]);

  const refreshOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/guest/orders");
      if (!response.ok) return;

      const data = await response.json();
      const orders = (data.orders ?? []) as Order[];

      for (const order of orders) {
        const prev = previousStatusRef.current[order.id];
        if (prev && prev !== order.status) {
          if (order.status === "confirmed" || order.status === "served") {
            setTrackerOpen(true);
            setFocusOrderId(order.id);
          }
        }
        previousStatusRef.current[order.id] = order.status;
      }

      setActiveOrders(orders);
      setBillPaymentStatus(data.billPaymentStatus ?? null);
    } catch {
      // silent fail on poll
    }
  }, []);

  const saveIdentity = useCallback(
    async (phone: string, name: string) => {
      try {
        const res = await fetch(
          `/api/v1/guest/customer?restaurantId=${restaurantId}&phone=${phone}`,
        );
        const data = await res.json();
        const resolvedName = (data.name as string | null) ?? name;
        const resolvedId = (data.id as string | null) ?? null;
        setCustomerPhone(phone);
        setCustomerName(resolvedName || null);
        setCustomerId(resolvedId);
        localStorage.setItem(phoneStorageKey(restaurantId), phone);
        localStorage.setItem(
          customerStorageKey(restaurantId),
          JSON.stringify({ name: resolvedName || null, id: resolvedId }),
        );
        await refreshOrders();
      } catch {}
    },
    [restaurantId, refreshOrders],
  );

  useEffect(() => {
    let cancelled = false;

    setActiveOrders([]);
    setFocusOrderId(null);
    setTableLabel(null);
    setBillPaymentStatus(null);
    setSessionReady(false);
    setSessionId(null);
    setGuestRestaurantId(null);
    realtimeConnectedRef.current = false;
    previousStatusRef.current = {};

    async function bootstrapSession() {
      try {
        const response = await fetch("/api/v1/guest/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, tableToken }),
        });

        if (!response.ok) {
          if (!cancelled) setSessionReady(true);
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          setTableLabel(data.tableLabel ?? null);
          setSessionId(data.sessionId ?? null);
          setGuestRestaurantId(data.restaurantId ?? null);
          setSessionReady(true);
        }

        await refreshOrders();
      } catch {
        if (!cancelled) setSessionReady(true);
      }
    }

    bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, [slug, tableToken, refreshOrders]);

  // Strategy 1 — Supabase Realtime: subscribe to order changes for this session.
  // Zero polling calls while the WebSocket is alive.
  useEffect(() => {
    if (!sessionId || !guestRestaurantId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`guest-orders-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `table_session_id=eq.${sessionId}`,
        },
        () => refreshOrders(),
      )
      .subscribe((status) => {
        realtimeConnectedRef.current = status === "SUBSCRIBED";
      });

    return () => {
      realtimeConnectedRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [sessionId, guestRestaurantId, refreshOrders]);

  // Strategy 2–4 — Smart polling fallback (only runs when Realtime is down).
  useEffect(() => {
    if (!sessionReady) return;

    // Strategy 3 — stop entirely when nothing needs tracking
    const allDone = activeOrders.length > 0 &&
      activeOrders.every((o) => o.status === "served" || o.status === "cancelled");
    const needsPoll = (activeOrderCount > 0 || hasSessionBill) && !allDone;
    if (!needsPoll) return;

    // Strategy 4 — exponential backoff based on oldest active order age
    const oldestActive = activeOrders
      .filter((o) => o.status !== "served" && o.status !== "cancelled")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

    const orderAgeMs = oldestActive
      ? Date.now() - new Date(oldestActive.createdAt).getTime()
      : 0;

    const backoffMs =
      orderAgeMs < 2 * 60_000  ? 12_000  // first 2 min: every 12s
      : orderAgeMs < 10 * 60_000 ? 30_000 // 2–10 min: every 30s
      : 60_000;                            // 10+ min: every 60s

    const interval = setInterval(() => {
      // Strategy 1 — skip poll if Realtime is connected
      if (realtimeConnectedRef.current) return;
      // Strategy 2 — skip poll if tab is hidden
      if (document.visibilityState !== "visible") return;
      refreshOrders();
    }, backoffMs);

    // Strategy 2 — refresh immediately when tab becomes visible again
    const onVisible = () => {
      if (document.visibilityState === "visible" && !realtimeConnectedRef.current) {
        refreshOrders();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    // Strategy 5 — clean up on page unload
    const onUnload = () => clearInterval(interval);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [sessionReady, activeOrders, activeOrderCount, hasSessionBill, refreshOrders]);

  const addItem = useCallback((item: GuestMenuItem) => {
    if (!orderingEnabled) return;
    setLines((current) => {
      const existing = current.find((line) => line.menuItemId === item.id);
      if (existing) {
        return current.map((line) =>
          line.menuItemId === item.id
            ? { ...line, quantity: Math.min(line.quantity + 1, 99) }
            : line,
        );
      }

      return [
        ...current,
        {
          menuItemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity: 1,
          dietaryType: item.dietaryType,
        },
      ];
    });
  }, [orderingEnabled]);

  const removeItem = useCallback((menuItemId: string) => {
    setLines((current) =>
      current.filter((line) => line.menuItemId !== menuItemId),
    );
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setLines((current) =>
        current.filter((line) => line.menuItemId !== menuItemId),
      );
      return;
    }

    setLines((current) =>
      current.map((line) =>
        line.menuItemId === menuItemId
          ? { ...line, quantity: Math.min(quantity, 99) }
          : line,
      ),
    );
  }, []);

  const updateLineNotes = useCallback((menuItemId: string, notes: string) => {
    setLines((current) =>
      current.map((line) =>
        line.menuItemId === menuItemId
          ? { ...line, notes: notes.slice(0, 120) || undefined }
          : line,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const itemCount = useMemo(
    () => lines.reduce((total, line) => total + line.quantity, 0),
    [lines],
  );

  const subtotalCents = useMemo(
    () =>
      lines.reduce(
        (total, line) => total + line.priceCents * line.quantity,
        0,
      ),
    [lines],
  );

  const placeOrder = useCallback(
    async (notes?: string, identity?: { phone: string; name: string }) => {
      if (!orderingEnabled) return { error: "Ordering is currently unavailable" };
      if (!lines.length) return { error: "Add at least one dish to order" };

      // If identity was just collected, save it locally before the request
      if (identity?.phone && !customerPhone) {
        setCustomerPhone(identity.phone);
        setCustomerName(identity.name || null);
        localStorage.setItem(phoneStorageKey(restaurantId), identity.phone);
        localStorage.setItem(
          customerStorageKey(restaurantId),
          JSON.stringify({ name: identity.name || null, id: null }),
        );
      }

      const response = await fetch("/api/v1/guest/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines,
          notes,
          phone: identity?.phone ?? customerPhone ?? undefined,
          name: identity?.name ?? customerName ?? undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error ?? "Failed to place order" };
      }

      const order = data.order as Order;
      clearCart();
      setCartOpen(false);

      await refreshOrders();

      if (order?.id) {
        setFocusOrderId(order.id);
        setTrackerOpen(true);
      }

      return { orderId: order?.id };
    },
    [lines, clearCart, refreshOrders, customerPhone, customerName, restaurantId, orderingEnabled],
  );

  const requestService = useCallback(async (type: "waiter" | "water" | "bill") => {
    const response = await fetch("/api/v1/guest/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { error: data.error ?? "Failed to send request" };
    }

    return {};
  }, []);

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      subtotalCents,
      tableLabel,
      sessionReady,
      orderingEnabled,
      serviceRequestsEnabled,
      loyaltyEnabled,
      cartOpen,
      setCartOpen,
      activeOrders,
      focusOrder,
      focusOrderId,
      setFocusOrderId,
      trackerOpen,
      setTrackerOpen,
      activeOrderCount,
      servedOrders,
      sessionBillCents,
      hasSessionBill,
      billPaymentStatus,
      customerPhone,
      customerName,
      customerId,
      saveIdentity,
      addItem,
      removeItem,
      updateQuantity,
      updateLineNotes,
      clearCart,
      placeOrder,
      requestService,
      refreshOrders,
    }),
    [
      lines,
      itemCount,
      subtotalCents,
      tableLabel,
      sessionReady,
      orderingEnabled,
      serviceRequestsEnabled,
      loyaltyEnabled,
      cartOpen,
      activeOrders,
      focusOrder,
      focusOrderId,
      trackerOpen,
      activeOrderCount,
      servedOrders,
      sessionBillCents,
      hasSessionBill,
      billPaymentStatus,
      customerPhone,
      customerName,
      customerId,
      saveIdentity,
      addItem,
      removeItem,
      updateQuantity,
      updateLineNotes,
      clearCart,
      placeOrder,
      requestService,
      refreshOrders,
    ],
  );

  return (
    <GuestCartContext.Provider value={value}>{children}</GuestCartContext.Provider>
  );
}

export function useGuestCart() {
  const context = useContext(GuestCartContext);
  if (!context) {
    throw new Error("useGuestCart must be used within GuestCartProvider");
  }
  return context;
}
