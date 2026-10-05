import type { MarketplaceListingDTO } from "./types";

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export function formatReward(listing: Pick<MarketplaceListingDTO, "rewardAmount" | "rewardType">) {
  const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(listing.rewardAmount);
  if (listing.rewardType === "PERCENT_BACK") return amount + "% back";
  if (listing.rewardType === "POINTS") return amount + " points";
  if (listing.rewardType === "STATEMENT_CREDIT") return formatMoney(listing.rewardAmount) + " statement credit";
  return formatMoney(listing.rewardAmount) + (listing.rewardType === "CASH_BACK" ? " cash back" : " reward");
}

export function formatExpiration(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"));
}
