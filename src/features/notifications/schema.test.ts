import { describe, expect, it } from "vitest";

import { merchantFollowSchema, notificationIdSchema } from "./schema";

const merchantId = "11111111-1111-4111-8111-111111111111";

describe("notification schemas", () => {
  it("accepts follow and unfollow intents for opaque merchant IDs", () => {
    expect(merchantFollowSchema.safeParse({ merchantId, intent: "follow" }).success).toBe(true);
    expect(merchantFollowSchema.safeParse({ merchantId, intent: "unfollow" }).success).toBe(true);
  });

  it("rejects merchant slugs and unsupported intents", () => {
    expect(merchantFollowSchema.safeParse({ merchantId: "adobe", intent: "follow" }).success).toBe(false);
    expect(merchantFollowSchema.safeParse({ merchantId, intent: "email" }).success).toBe(false);
  });

  it("requires opaque notification IDs", () => {
    expect(notificationIdSchema.safeParse(merchantId).success).toBe(true);
    expect(notificationIdSchema.safeParse("new-message").success).toBe(false);
  });
});
