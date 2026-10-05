export const PUBLIC_MARKETPLACE_FIELDS = [
  "listing_id",
  "merchant_id",
  "merchant_name",
  "merchant_slug",
  "offer_title",
  "offer_description",
  "reward_amount",
  "reward_type",
  "canonical_spend_requirement",
  "min_spend",
  "ask_amount",
  "is_obo",
  "expiration_date",
  "seller_rating_average",
  "seller_rating_count",
  "seller_completed_interaction_count",
  "verification_badge",
  "created_at",
] as const;

export const MARKETPLACE_COLUMNS = "listing_id, merchant_id, merchant_name, merchant_slug, offer_title, offer_description, reward_amount, reward_type, canonical_spend_requirement, min_spend, ask_amount, is_obo, expiration_date, seller_rating_average, seller_rating_count, seller_completed_interaction_count, verification_badge, created_at" as const;
