import { BadgeCheck, Gauge, Star } from "lucide-react";
import Link from "next/link";

import { formatMoney } from "@/features/marketplace/format";
import type { MarketplaceListingDTO } from "@/features/marketplace/types";

export function ListingCard({ listing }: { listing: MarketplaceListingDTO }) {
  return <Link href={"/listings/" + listing.listingId} className="block min-w-0 rounded-3xl border border-border bg-card p-4 shadow-[0_18px_55px_-44px_rgba(16,48,51,0.6)] transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-5">
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{listing.merchantName}</p>
        <h3 className="mt-2 text-lg font-semibold leading-6">Verified Listing</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{listing.offerTitle}</p>
      </div>
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-base font-bold text-primary">{listing.merchantName.slice(0, 1)}</span>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-muted/70 p-3"><p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Min spend</p><p className="mt-1 font-semibold">{formatMoney(listing.minSpend)}</p></div>
      <div className="rounded-2xl bg-secondary/70 p-3"><p className="text-[11px] font-medium tracking-wide text-primary/70 uppercase">Ask</p><p className="mt-1 font-semibold text-primary">{formatMoney(listing.askAmount)}{listing.isObo ? " OBO" : ""}</p></div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <span className="inline-flex items-center gap-1 font-semibold text-primary"><BadgeCheck aria-hidden="true" className="size-4" /> Listing verified</span>
      {listing.sellerResponseRate !== null ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Gauge aria-hidden="true" className="size-3.5" /> {listing.sellerResponseRate.toFixed(0)}% response rate</span> : null}
    </div>
    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
      <span className="font-semibold">Seller Rating</span>
      <span className="inline-flex items-center gap-1 text-muted-foreground"><Star aria-hidden="true" className="size-4 shrink-0 fill-current text-[#b98224]" /> {listing.sellerRatingCount ? listing.sellerRatingAverage.toFixed(1) : "New"} <span className="text-xs">· {listing.sellerRatingCount} reviews · {listing.sellerCompletedInteractionCount} completed</span></span>
    </div>
    <span className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Unlock Chat — $1.99</span>
  </Link>;
}
