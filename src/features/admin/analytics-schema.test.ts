import { describe, expect, it } from "vitest";

import { adminAnalyticsSchema } from "./analytics-schema";

const validAnalytics = {
  total_users: 10,
  active_users: 8,
  active_verified_listings: 6,
  pending_verifications: 2,
  completed_interactions: 4,
  chat_unlock_count: 5,
  platform_revenue_cents: 1093,
  open_reports: 1,
  listing_to_chat_conversion: 25,
  repeat_buyer_count: 2,
  top_merchants_by_listings: [{ merchant_id: "11111111-1111-4111-8111-111111111111", merchant_name: "Adobe", count: 4 }],
  top_merchants_by_searches: [],
};

describe("admin analytics response", () => {
  it("accepts the aggregate-only response", () => {
    expect(adminAnalyticsSchema.parse(validAnalytics)).toEqual(validAnalytics);
  });

  it("rejects unexpected private fields", () => {
    expect(() => adminAnalyticsSchema.parse({ ...validAnalytics, email: "private@example.com" })).toThrow();
  });
});
