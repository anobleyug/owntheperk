import { z } from "zod";

const merchantMetricSchema = z.object({
  merchant_id: z.uuid(),
  merchant_name: z.string(),
  count: z.coerce.number().int().nonnegative(),
}).strict();

export const adminAnalyticsSchema = z.object({
  total_users: z.coerce.number().int().nonnegative(),
  active_users: z.coerce.number().int().nonnegative(),
  active_verified_listings: z.coerce.number().int().nonnegative(),
  pending_verifications: z.coerce.number().int().nonnegative(),
  completed_interactions: z.coerce.number().int().nonnegative(),
  chat_unlock_count: z.coerce.number().int().nonnegative(),
  platform_revenue_cents: z.coerce.number().int().nonnegative(),
  open_reports: z.coerce.number().int().nonnegative(),
  listing_to_chat_conversion: z.coerce.number().min(0).max(100),
  repeat_buyer_count: z.coerce.number().int().nonnegative(),
  top_merchants_by_listings: z.array(merchantMetricSchema).max(5),
  top_merchants_by_searches: z.array(merchantMetricSchema).max(5),
}).strict();
