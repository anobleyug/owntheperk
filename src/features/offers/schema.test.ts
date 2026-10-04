import { describe, expect, it } from "vitest";

import { offerFormSchema } from "./schema";

const futureYear = new Date().getUTCFullYear() + 2;
const validOffer = {
  cardId: "11111111-1111-4111-8111-111111111111",
  merchantId: "22222222-2222-4222-8222-222222222222",
  title: "$250 statement credit after $600 spend",
  description: "Eligible purchases under the displayed issuer terms.",
  spendRequirement: "600",
  rewardAmount: "250",
  rewardType: "STATEMENT_CREDIT",
  expirationDate: `${futureYear}-12-31`,
};

describe("offerFormSchema", () => {
  it("parses a valid offer and numeric amounts", () => {
    const parsed = offerFormSchema.parse(validOffer);
    expect(parsed.spendRequirement).toBe(600);
    expect(parsed.rewardAmount).toBe(250);
  });

  it.each(["-1", "1.234", "not-money"])("rejects invalid amount %s", (amount) => {
    expect(
      offerFormSchema.safeParse({ ...validOffer, spendRequirement: amount }).success,
    ).toBe(false);
  });

  it("rejects an expired offer", () => {
    expect(
      offerFormSchema.safeParse({ ...validOffer, expirationDate: "2020-01-01" }).success,
    ).toBe(false);
  });
});
