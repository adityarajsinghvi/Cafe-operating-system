"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";

type RealtimeTable = "orders" | "service_requests" | "table_sessions";

/**
 * Subscribes to Supabase Realtime changes for a restaurant.
 * Each caller must pass a unique `scope` — multiple hooks cannot share one channel name.
 */
export function useRestaurantRealtime(
  restaurantId: string,
  onChange: () => void,
  options: {
    scope: string;
    tables: RealtimeTable[];
    enabled?: boolean;
  },
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const enabled = options.enabled ?? true;
  const tablesKey = options.tables.join(",");

  useEffect(() => {
    if (!enabled || !restaurantId || options.tables.length === 0) return;

    const supabase = createClient();
    const channelName = `restaurant-${restaurantId}-${options.scope}`;

    let channel = supabase.channel(channelName);

    for (const table of options.tables) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => onChangeRef.current(),
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, enabled, options.scope, tablesKey]);
}
