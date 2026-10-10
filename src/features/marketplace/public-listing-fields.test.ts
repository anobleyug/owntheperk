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
      "seller_response_rate",
      "seller_response_bucket",
      "seller_activity_status",
      "seller_availability_status",
      "verification_badge",
    ]));
  });

  it("does not expose private listing or verification fields", () => {
    expect(PUBLIC_MARKETPLACE_FIELDS).not.toEqual(expect.arrayContaining([
      "user_id",
      "card_id",
      "evidence_path",
      "seller_notes",
      "reviewer_id",
      "verification_timestamp",
      "last_active_at",
      "median_response_seconds",
      "response_sample_count",
    ]));
  });
});
