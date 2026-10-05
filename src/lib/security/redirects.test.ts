import { describe, expect, it } from "vitest";

import { safeAuthDestination, safeStripeCheckoutUrl } from "./redirects";

describe("safeAuthDestination", () => {
  it("allows only known same-origin auth destinations", () => {
    expect(safeAuthDestination("/reset-password")).toBe("/reset-password");
    expect(safeAuthDestination("/search?admin=true")).toBe("/search");
  });

  it.each(["//evil.example", "https://evil.example", "/\\evil.example", "/admin", "%2F%2Fevil.example"])(
    "rejects unsafe destination %s",
    (value) => expect(safeAuthDestination(value)).toBe("/onboarding"),
  );
});

describe("safeStripeCheckoutUrl", () => {
  it("allows Stripe-hosted HTTPS checkout", () => {
    expect(safeStripeCheckoutUrl("https://checkout.stripe.com/c/pay/test")).toBe("https://checkout.stripe.com/c/pay/test");
  });

  it.each(["http://checkout.stripe.com/test", "https://checkout.stripe.com.evil.test", "https://evil.test"])(
    "rejects unsafe checkout URL %s",
    (value) => expect(safeStripeCheckoutUrl(value)).toBeNull(),
  );
});
