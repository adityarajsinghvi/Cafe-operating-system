type RuleSet = { pattern: RegExp; tag: string }[];

const RULES: RuleSet = [
  // Dietary
  { pattern: /\bveg(etarian)?\b/, tag: "vegetarian" },
  { pattern: /\bvegan\b/, tag: "vegan" },
  { pattern: /\bnon.?veg\b|chicken|mutton|lamb|fish|prawn|seafood|egg/, tag: "non-veg" },

  // Flavor
  { pattern: /spic|hot sauce|chilli|chili|jalap|mirchi/, tag: "spicy" },
  { pattern: /sweet|sugar|honey|caramel|jaggery|mithai/, tag: "sweet" },
  { pattern: /tang|sour|tamarind|imli|citrus|lemon|lime/, tag: "tangy" },
  { pattern: /cream|creamy|butter|rich|malai/, tag: "creamy" },
  { pattern: /mild|not spicy/, tag: "mild" },

  // Cooking method
  { pattern: /\bgrilled?\b|bbq|tandoor/, tag: "grilled" },
  { pattern: /\bfried\b|deep.?fry|crispy|crunchy/, tag: "fried" },
  { pattern: /\bbaked?\b|oven/, tag: "baked" },
  { pattern: /\bsteamed?\b/, tag: "steamed" },
  { pattern: /\broasted?\b/, tag: "roasted" },
  { pattern: /smoked?/, tag: "smoked" },

  // Main protein / ingredient
  { pattern: /\bchicken\b/, tag: "chicken" },
  { pattern: /\bmutton\b|\bgoat\b/, tag: "mutton" },
  { pattern: /\bfish\b|\bbasa\b|\bsalmon\b|\btilapia\b/, tag: "fish" },
  { pattern: /\bprawn\b|\bshrimp\b/, tag: "prawn" },
  { pattern: /\bpaneer\b/, tag: "paneer" },
  { pattern: /\btofu\b/, tag: "tofu" },
  { pattern: /\begg\b/, tag: "egg" },
  { pattern: /\bmushroom\b/, tag: "mushroom" },
  { pattern: /\bsoybean\b|\bsoy\b/, tag: "soy" },

  // Beverages
  { pattern: /\bcoffee\b|\bcappuccino\b|\blatte\b|\bespresso\b|\bmocha\b|\bmacchiato\b/, tag: "coffee" },
  { pattern: /\btea\b|\bchai\b|\bmatcha\b/, tag: "tea" },
  { pattern: /\bjuice\b/, tag: "juice" },
  { pattern: /\bshake\b|\bsmooth/, tag: "smoothie" },
  { pattern: /\blassi\b/, tag: "lassi" },
  { pattern: /\bmocktail\b/, tag: "mocktail" },
  { pattern: /\bcocktail\b/, tag: "cocktail" },
  { pattern: /\bcold brew\b|\biced\b|\bfrappe\b|\bfrappuccino\b/, tag: "cold" },
  { pattern: /\bhot\b/, tag: "hot" },
  { pattern: /\bsoda\b|\baerated\b/, tag: "soda" },

  // Cuisine
  { pattern: /\bindian\b|\bmasala\b|\bcurry\b|\bdal\b|\bsabzi\b|\bkorma\b|\bbiryani\b|\bpulao\b/, tag: "indian" },
  { pattern: /\bchines\b|\bnoodle\b|\bfried rice\b|\bmanchuri\b|\bhakka\b|\bwonton\b/, tag: "chinese" },
  { pattern: /\bitalian\b|\bpasta\b|\bpizza\b|\brisotto\b|\bpenne\b|\balfredo\b|\bpesto\b/, tag: "italian" },
  { pattern: /\bcontinental\b|\beuropean\b/, tag: "continental" },
  { pattern: /\bmexican\b|\btaco\b|\bwrap\b|\bnachos\b|\bburrito\b/, tag: "mexican" },
  { pattern: /\barabian\b|\blebanese\b|\bshawarma\b|\bhummus\b|\bfalafel\b/, tag: "middle eastern" },

  // Meal occasion
  { pattern: /\bbreakfast\b|\bidli\b|\bdosa\b|\bvada\b|\bpoha\b|\bupma\b|\bparatha\b/, tag: "breakfast" },
  { pattern: /\bsnack\b|\bstarter\b|\bappetizer\b|\bfinger food\b|\bchaat\b/, tag: "snack" },
  { pattern: /\bmain course\b|\bmain dish\b|\bmains?\b/, tag: "main course" },
  { pattern: /\bdessert\b|\bcake\b|\bice.?cream\b|\bbrownie\b|\bgulab\b|\bhalwa\b|\bkheer\b|\bculfi\b|\bpayasam\b/, tag: "dessert" },
  { pattern: /\bsoup\b|\bbroth\b/, tag: "soup" },
  { pattern: /\bsalad\b/, tag: "salad" },
  { pattern: /\bsandwich\b|\bburguer\b|\bburger\b/, tag: "burger" },
  { pattern: /\bread\b|\bnaan\b|\broti\b|\bchapati\b|\bparatha\b|\bpuri\b|\bbhatura\b/, tag: "bread" },
  { pattern: /\brice\b|\bbiryani\b|\bpulao\b|\bkhichdi\b/, tag: "rice" },

  // Mood / characteristic
  { pattern: /comfort|hearty|filling|wholesome/, tag: "comfort food" },
  { pattern: /refresh|light|healthy|diet|low.?cal/, tag: "light" },
  { pattern: /indulg|rich|decadent|loaded/, tag: "indulgent" },
  { pattern: /\bpopular\b|\bbest.?seller\b|\bsignature\b|\bspecial\b/, tag: "signature" },
];

export function getRuleBasedTags(
  name: string,
  description: string | null | undefined,
  dietaryType: string | null | undefined,
): string[] {
  const text = `${name} ${description ?? ""} ${dietaryType ?? ""}`.toLowerCase();
  const tags: string[] = [];

  // Always add dietary type as tag
  if (dietaryType === "veg" && !tags.includes("vegetarian")) tags.push("vegetarian");
  if (dietaryType === "vegan" && !tags.includes("vegan")) tags.push("vegan");
  if (dietaryType === "non_veg" && !tags.includes("non-veg")) tags.push("non-veg");
  if (dietaryType === "egg" && !tags.includes("egg")) tags.push("egg");

  for (const { pattern, tag } of RULES) {
    if (pattern.test(text) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 10);
}

// ── Section auto-detection ────────────────────────────────────────────────────
// Maps a category name to a suggested top-level section.
// Returns null if no confident match (UI will show "Uncategorised").

const SECTION_RULES: { pattern: RegExp; section: string; emoji: string }[] = [
  // Drinks / Beverages
  {
    pattern:
      /coffee|espresso|cappuccino|latte|mocha|macchiato|americano|cold brew|pour.?over|filter coffee|drip|cortado|flat white|ristretto/i,
    section: "Coffee",
    emoji: "☕",
  },
  {
    pattern: /tea|chai|matcha|green tea|herbal|oolong|bubble tea|boba|tapioca/i,
    section: "Tea",
    emoji: "🍵",
  },
  {
    pattern:
      /juice|smoothie|shake|frappe|frappuccino|lassi|mocktail|cocktail|soda|lemonade|cooler|coolers|cold drink|beverage|drink|agua|water|kombucha/i,
    section: "Drinks",
    emoji: "🥤",
  },

  // Food — Breakfast
  {
    pattern: /breakfast|morning|brunch|egg|omelette|toast|waffle|pancake|crepe|idli|dosa|vada|upma|poha|paratha/i,
    section: "Breakfast",
    emoji: "🍳",
  },

  // Food — Snacks / Starters
  {
    pattern:
      /snack|starter|appetizer|finger food|chaat|tikka|kebab|bruschetta|nachos|fries|wings|popcorn|spring roll|samosa|pakora|fry|crispy/i,
    section: "Snacks",
    emoji: "🍟",
  },

  // Food — Mains
  {
    pattern:
      /main|rice|biryani|pulao|pasta|pizza|burger|sandwich|wrap|curry|dal|sabzi|thali|roti|naan|bread|bowl|platter|meal|special/i,
    section: "Mains",
    emoji: "🍽️",
  },

  // Food — Desserts / Sweets
  {
    pattern:
      /dessert|sweet|cake|brownie|cookie|ice.?cream|gelato|kulfi|gulab|halwa|kheer|payasam|pastry|tart|pudding|mousse|cheesecake|waffle dessert/i,
    section: "Desserts",
    emoji: "🍰",
  },

  // Specials / Seasonal
  {
    pattern: /special|seasonal|limited|signature|chef|featured|new|trending|popular|must.?try|today/i,
    section: "Specials",
    emoji: "⭐",
  },

  // Bakery / Baked goods
  {
    pattern: /bakery|baked|bread|croissant|muffin|scone|bagel|baguette|loaf|danish|donut|doughnut/i,
    section: "Bakery",
    emoji: "🥐",
  },

  // Sides / Extras
  {
    pattern: /side|add.?on|extra|topping|sauce|dip|condiment|accompaniment/i,
    section: "Sides",
    emoji: "🫙",
  },
];

export function getSectionFromCategory(categoryName: string): { section: string; emoji: string } | null {
  const text = categoryName.toLowerCase();
  for (const { pattern, section, emoji } of SECTION_RULES) {
    if (pattern.test(text)) return { section, emoji };
  }
  return null;
}

export function mergeTags(...tagLists: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of tagLists) {
    for (const tag of list) {
      const t = tag.trim().toLowerCase();
      if (t && !seen.has(t)) {
        seen.add(t);
        result.push(t);
      }
    }
  }
  return result;
}
