import { CalendarDays, Star } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatExpiration, formatMoney, formatReward } from "@/features/marketplace/format";
import type { MarketplaceOfferDTO } from "@/features/marketplace/types";

export function GroupedOfferCard({ offer }: { offer: MarketplaceOfferDTO }) {
  const publicCard = [offer.publicIssuer, offer.publicCardProduct].filter(Boolean).join(" ");

  return <article className="rounded-3xl border border-border bg-card p-5 shadow-[0_18px_55px_-44px_rgba(16,48,51,0.6)] sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{offer.merchantName}</p>
        <h3 className="mt-2 text-lg font-semibold leading-6">Spend {formatMoney(offer.canonicalSpendRequirement)} → Get {formatReward(offer)}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{offer.offerTitle}</p>
        {publicCard ? <p className="mt-2 text-sm font-medium">{publicCard}</p> : null}
      </div>
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-base font-bold text-primary">{offer.merchantName.slice(0, 1)}</span>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-muted/70 p-3"><p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Available</p><p className="mt-1 font-semibold">{offer.activeListingCount} {offer.activeListingCount === 1 ? "listing" : "listings"}</p></div>
      <div className="rounded-2xl bg-secondary/70 p-3"><p className="text-[11px] font-medium tracking-wide text-primary/70 uppercase">Lowest ask</p><p className="mt-1 font-semibold text-primary">From {formatMoney(offer.lowestAsk)}</p></div>
    </div>

    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="size-3.5" /> Expires {formatExpiration(offer.expirationDate)}</span>
      <span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="size-3.5 fill-current text-[#b98224]" /> Highest rating {offer.highestRating.toFixed(1)}</span>
    </div>

    <Link href={`/offers/${offer.offerId}`} className={buttonVariants({ className: "mt-5 w-full" })}>View Listings</Link>
  </article>;
}
