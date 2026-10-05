import { z } from "zod";

import { REPORT_REASONS } from "./types";

const score = z.coerce.number().int().min(1).max(5);

export const ratingSchema = z.object({
  conversationId: z.uuid(),
  overallScore: score,
  communicationScore: score,
  reliabilityScore: score,
  accuracyScore: score,
  reviewText: z.string().trim().max(500, "Reviews must be 500 characters or fewer."),
});

export const blockSchema = z.object({ targetUserId: z.uuid() });

export const reportSchema = z.object({
  reportedUserId: z.uuid(),
  conversationId: z.union([z.uuid(), z.literal("")]),
  offerListingId: z.union([z.uuid(), z.literal("")]),
  reason: z.enum(REPORT_REASONS),
  description: z.string().trim().min(10, "Add at least 10 characters of context.").max(1000, "Reports must be 1,000 characters or fewer."),
}).refine((value) => value.conversationId || value.offerListingId, {
  message: "A conversation or listing is required.",
  path: ["conversationId"],
});
