import { describe, expect, it } from "vitest";

import { PUBLIC_MARKETPLACE_FIELDS } from "./public-listing-fields";

describe("public marketplace field allowlist", () => {
  it("does not expose pre-unlock seller identity", () => {
    expect(PUBLIC_MARKETPLACE_FIELDS).not.toEqual(expect.arrayContaining([
      "seller_user_id",
      "seller_username",
      "seller_avatar_url",
      "seller_profile_url",
    ]));
  });

  it("keeps reputation signals available", () => {
    expect(PUBLIC_MARKETPLACE_FIELDS).toEqual(expect.arrayContaining([
      "seller_rating_average",
      "seller_rating_count",
      "seller_completed_interaction_count",
      "verification_badge",
    ]));
  });
});
