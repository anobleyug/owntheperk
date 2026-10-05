import { describe, expect, it } from "vitest";

import { blockSchema, ratingSchema, reportSchema } from "./schema";

const conversationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

describe("trust schemas", () => {
  it("accepts a complete 1-5 rating", () => {
    expect(ratingSchema.safeParse({
      conversationId,
      overallScore: "5",
      communicationScore: "4",
      reliabilityScore: "5",
      accuracyScore: "4",
      reviewText: "Clear and responsive.",
    }).success).toBe(true);
  });

  it("rejects scores outside 1-5", () => {
    expect(ratingSchema.safeParse({
      conversationId,
      overallScore: 6,
      communicationScore: 4,
      reliabilityScore: 5,
      accuracyScore: 4,
      reviewText: "",
    }).success).toBe(false);
  });

  it("requires report context and a supported reason", () => {
    expect(reportSchema.safeParse({
      reportedUserId: userId,
      conversationId,
      offerListingId: "",
      reason: "CREDENTIAL_REQUEST",
      description: "Asked me to send issuer login credentials.",
    }).success).toBe(true);
    expect(reportSchema.safeParse({
      reportedUserId: userId,
      conversationId: "",
      offerListingId: "",
      reason: "OTHER",
      description: "Enough context but no linked marketplace record.",
    }).success).toBe(false);
  });

  it("requires an opaque target for blocking", () => {
    expect(blockSchema.safeParse({ targetUserId: userId }).success).toBe(true);
    expect(blockSchema.safeParse({ targetUserId: "DealPilot82" }).success).toBe(false);
  });
});
