"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, MessageCircle, Star, UserRound } from "lucide-react";

import { fetchMarketplaceListing } from "../client";
import { formatExpiration, formatMoney, formatReward } from "../format";
import type { MarketplaceListingDTO } from "../types";
import { SaveOfferButton } from "@/features/saved-offers/components/save-offer-button";
import { SellerSignals } from "./seller-signals";

export function PublicListingDetails({ initialListing, initiallySaved }: { initialListing: MarketplaceListingDTO; initiallySaved: boolean }) {
  const { data: listing, isFetching } = useQuery({
    queryKey: ["public-marketplace-listing", initialListing.listingId],
    queryFn: () => fetchMarketplaceListing(initialListing.listingId),
    initialData: initialListing,
    staleTime: 30_000,
  });

  return <>
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-8" aria-busy={isFetching}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{listing.merchantName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">{formatReward(listing)}</h1>
          <p className="mt-2 text-lg font-medium">{listing.offerTitle}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{listing.offerDescription || "No additional credit card offer description."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary"><BadgeCheck aria-hidden="true" className="size-4" /> Offer verified</span>
          <SaveOfferButton offerId={listing.offerId} initiallySaved={initiallySaved} />
        </div>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-muted/70 p-4"><p className="text-xs text-muted-foreground">Min spend</p><p className="mt-2 font-semibold">{formatMoney(listing.minSpend)}</p></div>
        <div className="rounded-2xl bg-secondary/70 p-4"><p className="text-xs text-primary/70">Ask</p><p className="mt-2 font-semibold text-primary">{formatMoney(listing.askAmount)}{listing.isObo ? " OBO" : ""}</p><p className="mt-1 text-xs text-primary/70">{listing.isObo ? "Negotiable" : "Fixed ask"}</p></div>
        <div className="rounded-2xl bg-muted/70 p-4"><p className="text-xs text-muted-foreground">Offer spend</p><p className="mt-2 font-semibold">{formatMoney(listing.canonicalSpendRequirement)}</p></div>
        <div className="rounded-2xl bg-muted/70 p-4"><CalendarDays aria-hidden="true" className="size-4 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Expires</p><p className="mt-1 font-semibold">{formatExpiration(listing.expirationDate)}</p></div>
      </div>
    </section>

    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-brand-ink text-primary-foreground"><UserRound aria-hidden="true" className="size-5" /></span>
        <div><p className="font-semibold">Seller Rating</p>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="size-3.5 fill-current text-[#b98224]" /> {listing.sellerRatingAverage.toFixed(1)} ({listing.sellerRatingCount})</span><span className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="size-3.5" /> {listing.sellerCompletedInteractionCount} interactions</span></p>
          <div className="mt-2"><SellerSignals listing={listing} /></div>
        </div>
      </div>
    </section>
  </>;
}
