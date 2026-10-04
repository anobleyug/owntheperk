import { describe, expect, it } from "vitest";

import { cardFormSchema } from "./schema";

describe("cardFormSchema", () => {
  it("accepts an owner-only card organizer record", () => {
    expect(
      cardFormSchema.safeParse({
        issuer: "American Express",
        nickname: "Business Card",
        cardType: "Business",
        last4: "1234",
      }).success,
    ).toBe(true);
  });

  it.each(["123", "12345", "12x4", "4111111111111111"])(
    "rejects invalid last-four value %s",
    (last4) =>
      expect(
        cardFormSchema.safeParse({
          issuer: "Issuer",
          nickname: "Private Card",
          cardType: "",
          last4,
        }).success,
      ).toBe(false),
  );
});
