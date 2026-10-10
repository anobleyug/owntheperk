import { Clock3, Gauge, PauseCircle } from "lucide-react";

import type { MarketplaceListingDTO } from "../types";

const responseLabels: Record<NonNullable<MarketplaceListingDTO["sellerResponseBucket"]>, string> = {
  WITHIN_ONE_HOUR: "Usually responds within 1 hour",
  WITHIN_FEW_HOURS: "Usually responds within a few hours",
  WITHIN_ONE_DAY: "Usually responds within a day",
  OVER_ONE_DAY: "Usually responds in a day or more",
};

export function SellerSignals({ listing }: { listing: MarketplaceListingDTO }) {
  const activity = listing.sellerActivityStatus === "ACTIVE_NOW"
    ? "Active now"
    : listing.sellerActivityStatus === "ACTIVE_TODAY" ? "Active today" : null;
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
    {listing.sellerAvailabilityStatus === "TEMPORARILY_UNAVAILABLE" ? <span className="inline-flex items-center gap-1 font-semibold"><PauseCircle aria-hidden="true" className="size-3.5" /> Temporarily unavailable</span> : null}
    {activity ? <span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="size-3.5" /> {activity}</span> : null}
    {listing.sellerResponseBucket ? <span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="size-3.5" /> {responseLabels[listing.sellerResponseBucket]}</span> : null}
    {listing.sellerResponseRate !== null ? <span className="inline-flex items-center gap-1"><Gauge aria-hidden="true" className="size-3.5" /> {listing.sellerResponseRate.toFixed(0)}% response rate</span> : null}
  </div>;
}
