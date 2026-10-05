import { describe, expect, it } from "vitest";

import { offerListingFormSchema } from "./schema";

const validListing = {
  cardId: "11111111-1111-4111-8111-111111111111",
  offerId: "22222222-2222-4222-8222-222222222222",
  minSpend: "600",
  askAmount: "500",
  isObo: "on",
};

describe("offerListingFormSchema", () => {
  it("parses marketplace money and OBO terms", () => {
    const parsed = offerListingFormSchema.parse(validListing);
    expect(parsed.minSpend).toBe(600);
    expect(parsed.askAmount).toBe(500);
    expect(parsed.isObo).toBe(true);
  });

  it.each(["-1", "1.234", "not-money"])("rejects invalid amount %s", (amount) => {
    expect(offerListingFormSchema.safeParse({ ...validListing, askAmount: amount }).success).toBe(false);
  });

  it("requires a canonical offer UUID", () => {
    expect(offerListingFormSchema.safeParse({ ...validListing, offerId: "" }).success).toBe(false);
  });

  it("treats an unchecked OBO field as false", () => {
    expect(offerListingFormSchema.parse({ ...validListing, isObo: null }).isObo).toBe(false);
  });
});
