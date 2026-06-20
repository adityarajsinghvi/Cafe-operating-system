/** Warm cocoa accent used when brand color is missing or too dark for light UI. */
export const GUEST_ACCENT_CSS = "var(--guest-accent)";

function isVeryDarkColor(color: string) {
  const value = color.trim().toLowerCase();

  if (["#000", "#000000", "black", "rgb(0,0,0)"].includes(value)) {
    return true;
  }

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return false;

  let normalized = hex[1];
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance < 0.2;
}

export function resolveGuestBrandColor(color?: string | null) {
  if (!color || isVeryDarkColor(color)) {
    return GUEST_ACCENT_CSS;
  }

  return color;
}
