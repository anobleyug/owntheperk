import { CalendarDays, CreditCard } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/features/offers/components/status-badge";
import { ListingAvailabilityButton } from "@/features/offers/components/listing-availability-button";
import type { PrivateOfferListingDTO } from "@/features/offers/types";

function rewardLabel(listing: PrivateOfferListingDTO) {
  const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(listing.rewardAmount);
  if (listing.rewardType === "PERCENT_BACK") return amount + "% back";
  if (listing.rewardType === "POINTS") return amount + " points";
  return "$" + amount + (listing.rewardType === "STATEMENT_CREDIT" ? " credit" : " back");
}

export function PrivateOfferListingCard({ listing }: { listing: PrivateOfferListingDTO }) {
  const canChangeAvailability = listing.verificationStatus === "VERIFIED" && (listing.listingStatus === "ACTIVE" || listing.listingStatus === "PAUSED");
  const canResume = listing.offerStatus === "ACTIVE" && listing.expirationDate >= new Date().toISOString().slice(0, 10);
  return <article className="rounded-3xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
    <Link href={"/offers/manage/" + listing.id} className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
    <div className="flex items-start justify-between gap-4"><div>
      <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">{listing.merchantName}</p>
      <h3 className="mt-2 font-semibold leading-6">{listing.title}</h3>
    </div><div className="flex flex-col items-end gap-1.5"><StatusBadge status={listing.verificationStatus} /><StatusBadge status={listing.listingStatus} /></div></div>
    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-2xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Min spend</p><p className="mt-1 font-semibold">USD {listing.minSpend.toLocaleString()}</p></div>
      <div className="rounded-2xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Ask</p><p className="mt-1 font-semibold">{listing.askAmount === null ? "Set an ask" : "$" + listing.askAmount.toLocaleString() + (listing.isObo ? " OBO" : "")}</p></div>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Credit Card Offer: {rewardLabel(listing)}</p>
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5"><CreditCard aria-hidden="true" className="size-3.5" />{listing.cardNickname}</span>
      <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="size-3.5" />Expires {listing.expirationDate}</span>
    </div>
    </Link>
    {listing.listingStatus === "PAUSED" ? <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">Temporarily unavailable</p> : null}
    {canChangeAvailability ? <div className="mt-4 border-t border-border pt-4"><ListingAvailabilityButton listingId={listing.id} listingStatus={listing.listingStatus as "ACTIVE" | "PAUSED"} canResume={canResume} /></div> : null}
  </article>;
}
