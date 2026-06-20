// Open-Meteo integration — free, no API key required.
// Caches geocoding + weather in-memory for 30 minutes to avoid hammering the API.

export type WeatherCondition =
  | "sunny"
  | "partly_cloudy"
  | "cloudy"
  | "foggy"
  | "drizzle"
  | "rainy"
  | "thunderstorm"
  | "snowy";

export interface WeatherSnapshot {
  tempC: number;
  condition: WeatherCondition;
  label: string; // human-friendly, e.g. "Rainy, 18°C"
}

// WMO weather interpretation codes → our simplified conditions
function wmoToCondition(code: number): WeatherCondition {
  if (code === 0) return "sunny";
  if (code <= 2) return "partly_cloudy";
  if (code === 3) return "cloudy";
  if (code <= 49) return "foggy";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rainy";
  if (code <= 77) return "snowy";
  if (code <= 82) return "rainy";
  return "thunderstorm";
}

const CONDITION_LABELS: Record<WeatherCondition, string> = {
  sunny: "Sunny",
  partly_cloudy: "Partly cloudy",
  cloudy: "Cloudy",
  foggy: "Foggy",
  drizzle: "Light drizzle",
  rainy: "Rainy",
  thunderstorm: "Thunderstorm",
  snowy: "Snowy",
};

// ── In-memory cache ────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const geocodeCache = new Map<string, CacheEntry<{ lat: number; lon: number } | null>>();
const weatherCache = new Map<string, CacheEntry<WeatherSnapshot | null>>();

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
  map.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Geocoding ──────────────────────────────────────────────────────────────────

async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  const cached = cacheGet(geocodeCache, city);
  if (cached !== undefined) return cached;

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Geocode ${res.status}`);
    const json = await res.json();
    const result = json.results?.[0] ?? null;
    const coords = result ? { lat: result.latitude as number, lon: result.longitude as number } : null;
    cacheSet(geocodeCache, city, coords);
    return coords;
  } catch {
    cacheSet(geocodeCache, city, null);
    return null;
  }
}

// ── Weather fetch ──────────────────────────────────────────────────────────────

export async function getWeatherForCity(city: string): Promise<WeatherSnapshot | null> {
  const cacheKey = city.toLowerCase().trim();
  const cached = cacheGet(weatherCache, cacheKey);
  if (cached !== undefined) return cached;

  const coords = await geocodeCity(cacheKey);
  if (!coords) {
    cacheSet(weatherCache, cacheKey, null);
    return null;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weathercode&timezone=auto&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Weather ${res.status}`);
    const json = await res.json();
    const current = json.current;
    const tempC = Math.round(current.temperature_2m as number);
    const condition = wmoToCondition(current.weathercode as number);
    const snapshot: WeatherSnapshot = {
      tempC,
      condition,
      label: `${CONDITION_LABELS[condition]}, ${tempC}°C`,
    };
    cacheSet(weatherCache, cacheKey, snapshot);
    return snapshot;
  } catch {
    cacheSet(weatherCache, cacheKey, null);
    return null;
  }
}
