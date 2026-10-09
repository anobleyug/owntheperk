import { describe, expect, it } from "vitest";

import { parseMarketplaceFilters, parseOfferListingsPage } from "./schema";

describe("parseMarketplaceFilters", () => {
  it("parses supported buyer filters", () => {
    expect(parseMarketplaceFilters({ issuer: "Amex", cardProduct: "Platinum", maxRequiredSpend: "600", maxAsk: "500", obo: "true", minRating: "4.5", sort: "lowest_ask" })).toMatchObject({
      issuer: "Amex", cardProduct: "Platinum", maxRequiredSpend: 600, maxAsk: 500, oboOnly: true, minRating: 4.5, sort: "lowest_ask", page: 1,
    });
  });

  it("falls back safely for unsupported sorting and pages", () => {
    expect(parseMarketplaceFilters({ sort: "private_column", page: "-2" })).toMatchObject({ sort: "newest", page: 1 });
  });

  it("does not send malformed dates to the database", () => {
    expect(parseMarketplaceFilters({ expiresAfter: "2026-99-99" }).expiresAfter).toBeUndefined();
  });

  it("accepts only positive offer-listing page numbers", () => {
    expect(parseOfferListingsPage("3")).toBe(3);
    expect(parseOfferListingsPage("0")).toBe(1);
  });
});
