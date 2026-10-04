import { describe, expect, it } from "vitest";

import { profileFormSchema, usernameSchema } from "./schema";

describe("usernameSchema", () => {
  it("accepts a pseudonymous handle", () => {
    expect(usernameSchema.parse("DealPilot82")).toBe("DealPilot82");
  });

  it.each(["admin", "Support", "own-the-perk"])(
    "rejects reserved username %s",
    (username) => expect(usernameSchema.safeParse(username).success).toBe(false),
  );

  it.each(["person@example", "Deal Pilot", "1DealPilot"])(
    "rejects invalid username %s",
    (username) => expect(usernameSchema.safeParse(username).success).toBe(false),
  );

  it("rejects phone-like usernames even with separators", () => {
    expect(usernameSchema.safeParse("Deal555-123-4567").success).toBe(false);
  });
});

describe("profileFormSchema", () => {
  it("allows empty optional profile fields", () => {
    expect(
      profileFormSchema.safeParse({
        username: "DealPilot82",
        avatarUrl: "",
        bio: "",
      }).success,
    ).toBe(true);
  });

  it("requires HTTPS for avatar URLs", () => {
    expect(
      profileFormSchema.safeParse({
        username: "DealPilot82",
        avatarUrl: "http://example.com/avatar.png",
        bio: "",
      }).success,
    ).toBe(false);
  });
});
