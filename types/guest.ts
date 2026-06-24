import type { DietaryType } from "@/types/menu";

export type GuestRestaurant = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string;
  currency: string;
  orderingEnabled: boolean;
  smartSuggestionsEnabled: boolean;
  serviceRequestsEnabled: boolean;
  loyaltyEnabled: boolean;
};

export type GuestMenuItem = {
  id: string;
  categoryId: string;
  sectionId: string | null;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  dietaryType: DietaryType;
  isPopular: boolean;
  isSpecial: boolean;
  tags: string[];
};

export type GuestMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  sectionId: string | null;
  items: GuestMenuItem[];
};

export type GuestMenuSection = {
  id: string;
  name: string;
  emoji: string | null;
  sortOrder: number;
};

export type GuestMenuStatus = "live" | "coming_soon" | "all_unavailable";

export type GuestMenu = {
  restaurant: GuestRestaurant;
  sections: GuestMenuSection[];
  categories: GuestMenuCategory[];
  popularItems: GuestMenuItem[];
  specialItems: GuestMenuItem[];
  status: GuestMenuStatus;
};

export type MenuFilter = "all" | "veg" | "vegan" | "non_veg" | "popular";

export function formatMenuPrice(cents: number, currency = "INR") {
  const amount = cents / 100;

  if (currency === "INR") {
    return `₹${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function filterMenuItems(
  items: GuestMenuItem[],
  query: string,
  filter: MenuFilter,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return items.filter((item) => {
    const matchesQuery =
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.description?.toLowerCase().includes(normalizedQuery);

    if (!matchesQuery) {
      return false;
    }

    switch (filter) {
      case "veg":
        return item.dietaryType === "veg";
      case "vegan":
        return item.dietaryType === "vegan";
      case "non_veg":
        return item.dietaryType === "non_veg" || item.dietaryType === "egg";
      case "popular":
        return item.isPopular;
      default:
        return true;
    }
  });
}
