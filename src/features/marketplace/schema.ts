import { z } from "zod";

import { MARKETPLACE_SORTS } from "./types";

const optionalAmount = z.preprocess(
  (value) => value === "" || value === undefined ? undefined : value,
  z.coerce.number().min(0).max(9_999_999_999.99).optional(),
);

export const marketplaceSearchSchema = z.object({
  q: z.string().trim().max(100).optional().transform((value) => value || undefined),
  maxAsk: optionalAmount,
  maxMinSpend: optionalAmount,
  minReward: optionalAmount,
  oboOnly: z.preprocess((value) => value === "true" || value === "on", z.boolean()),
  expiresAfter: z.preprocess(
    (value) => value === "" || value === undefined ? undefined : value,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => !Number.isNaN(Date.parse(value + "T00:00:00Z")))
      .optional(),
  ),
  minRating: z.preprocess(
    (value) => value === "" || value === undefined ? undefined : value,
    z.coerce.number().min(0).max(5).optional(),
  ),
  sort: z.enum(MARKETPLACE_SORTS).catch("newest"),
  page: z.coerce.number().int().min(1).catch(1),
});

export function parseMarketplaceFilters(input: Record<string, string | string[] | undefined>) {
  const parsed = marketplaceSearchSchema.safeParse({
    q: input.q,
    maxAsk: input.maxAsk,
    maxMinSpend: input.maxMinSpend,
    minReward: input.minReward,
    oboOnly: input.obo,
    expiresAfter: input.expiresAfter,
    minRating: input.minRating,
    sort: input.sort,
    page: input.page,
  });
  return parsed.success ? parsed.data : marketplaceSearchSchema.parse({});
}
