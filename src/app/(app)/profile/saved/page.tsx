import { Bell, Bookmark } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatExpiration, formatMoney, formatReward } from "@/features/marketplace/format";
import { ProfileTabs } from "@/features/profiles/components/profile-tabs";
import { removeSavedOfferAction } from "@/features/saved-offers/actions";
import { getSavedOffers } from "@/features/saved-offers/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved offers" };

export default async function SavedOffersPage() {
  const supabase = await createClient();
  const offers = await getSavedOffers(supabase);
  const today = new Date().toISOString().slice(0, 10);

  return <div className="space-y-8">
    <PageHeader eyebrow="Your marketplace profile" title="Saved offers" description="Keep shared offers handy and receive in-app alerts when listings, pricing, or availability changes." />
    <ProfileTabs active="saved" />

    {offers.length ? <div className="grid gap-4 md:grid-cols-2">
      {offers.map((offer) => {
        const expired = offer.offerStatus === "EXPIRED" || offer.expirationDate < today;
        const inactive = !expired && offer.offerStatus !== "ACTIVE";
        return <article key={offer.savedOfferId} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{offer.merchantName}</p>
              <h2 className="mt-2 text-lg font-semibold">{offer.offerTitle}</h2>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {(expired || inactive) && <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{expired ? "Expired" : "Inactive"}</span>}
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary"><Bell aria-hidden="true" className="size-3" /> Alerts on</span>
            </div>
          </div>

          <p className="mt-3 text-sm font-semibold">Spend {formatMoney(offer.canonicalSpendRequirement)} → Get {formatReward(offer)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Expires {formatExpiration(offer.expirationDate)}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Active listings</p><p className="mt-1 font-semibold">{offer.activeListingCount}</p></div>
            <div className="rounded-2xl bg-secondary/70 p-3"><p className="text-xs text-primary/70">Lowest ask</p><p className="mt-1 font-semibold text-primary">{offer.lowestAsk === null ? "—" : formatMoney(offer.lowestAsk)}</p></div>
          </div>

          {offer.activeListingCount === 0 && <p className="mt-4 text-sm font-medium text-muted-foreground">No listings available right now</p>}

          <div className="mt-5 flex flex-col gap-2 min-[420px]:flex-row">
            {offer.activeListingCount > 0 && !expired && !inactive
              ? <Link href={`/offers/${offer.offerId}`} className={buttonVariants({ className: "flex-1" })}>View Listings</Link>
              : <Button type="button" className="flex-1" disabled>View Listings</Button>}
            <form action={removeSavedOfferAction} className="flex-1">
              <input type="hidden" name="offerId" value={offer.offerId} />
              <Button type="submit" variant="outline" className="w-full"><Bookmark aria-hidden="true" /> Remove Saved</Button>
            </form>
          </div>
        </article>;
      })}
    </div> : <EmptyState icon={Bookmark} title="No saved offers yet" description="Save a shared offer from marketplace search or an offer detail page." action={<Link href="/search" className={buttonVariants()}>Browse offers</Link>} />}
  </div>;
}
