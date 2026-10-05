export const PUBLIC_MARKETPLACE_CACHE_CONTROL =
  "public, s-maxage=30, stale-while-revalidate=60";

export const PRIVATE_NO_STORE_CACHE_CONTROL = "private, no-store, max-age=0";

export const publicMarketplaceCacheHeaders = {
  "Cache-Control": PUBLIC_MARKETPLACE_CACHE_CONTROL,
  Vary: "Cookie",
} as const;

export const privateNoStoreHeaders = {
  "Cache-Control": PRIVATE_NO_STORE_CACHE_CONTROL,
} as const;
