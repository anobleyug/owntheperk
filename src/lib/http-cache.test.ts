import { describe, expect, it } from "vitest";

import {
  PRIVATE_NO_STORE_CACHE_CONTROL,
  PUBLIC_MARKETPLACE_CACHE_CONTROL,
  privateNoStoreHeaders,
  publicMarketplaceCacheHeaders,
} from "./http-cache";

describe("HTTP cache boundaries", () => {
  it("uses short shared caching only for sanitized marketplace responses", () => {
    expect(PUBLIC_MARKETPLACE_CACHE_CONTROL).toBe("public, s-maxage=30, stale-while-revalidate=60");
    expect(publicMarketplaceCacheHeaders).toMatchObject({
      "Cache-Control": PUBLIC_MARKETPLACE_CACHE_CONTROL,
      Vary: "Cookie",
    });
  });

  it("prevents private responses from being stored", () => {
    expect(PRIVATE_NO_STORE_CACHE_CONTROL).toBe("private, no-store, max-age=0");
    expect(privateNoStoreHeaders["Cache-Control"]).toBe(PRIVATE_NO_STORE_CACHE_CONTROL);
  });
});
