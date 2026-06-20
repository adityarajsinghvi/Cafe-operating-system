import { Badge } from "@/components/ui/badge";
import type { DietaryType } from "@/types/menu";

const labels: Record<DietaryType, string> = {
  veg: "Veg",
  non_veg: "Non-Veg",
  egg: "Egg",
  vegan: "Vegan",
  unknown: "—",
};

export function DietaryBadge({
  type,
  hideUnknown = false,
}: {
  type: DietaryType;
  hideUnknown?: boolean;
}) {
  if (hideUnknown && type === "unknown") {
    return null;
  }
  if (type === "veg" || type === "vegan") {
    return <Badge variant="veg">{labels[type]}</Badge>;
  }

  if (type === "non_veg" || type === "egg") {
    return <Badge variant="nonVeg">{labels[type]}</Badge>;
  }

  return <Badge variant="muted">{labels[type]}</Badge>;
}
