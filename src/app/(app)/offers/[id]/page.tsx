import { CalendarDays, ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { ListingCard } from "@/features/marketplace/components/listing-card";
import { getMarketplaceOfferListings } from "@/features/marketplace/data";
import { formatExpiration, formatMoney, formatReward } from "@/features/marketplace/format";
import { parseOfferListingsPage } from "@/features/marketplace/schema";
import { offerListingIdSchema } from "@/features/offers/schema";
import { createClient } from "@/lib/supabase/server";
import { isOfferSaved } from "@/features/saved-offers/data";
import { SaveOfferButton } from "@/features/saved-offers/components/save-offer-button";

export const metadata: Metadata = { title: "Verified offer listings" };

export default async function MarketplaceOfferPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { id } = await params;
  if (!offerListingIdSchema.safeParse(id).success) notFound();
  const page = parseOfferListingsPage((await searchParams).page);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [result, offerSaved] = await Promise.all([
    getMarketplaceOfferListings(supabase, id, page),
    user ? isOfferSaved(supabase, user.id, id) : false,
  ]);
  if (!result) notFound();
  const { offer, listings, total, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) notFound();
  const publicCard = [offer.publicIssuer, offer.publicCardProduct].filter(Boolean).join(" ");

  return <div className="space-y-8">
    <Link href="/search" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ChevronLeft aria-hidden="true" className="size-4" /> Back to search</Link>
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{offer.merchantName}</p>
        <SaveOfferButton offerId={offer.offerId} initiallySaved={offerSaved} />
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">Spend {formatMoney(offer.canonicalSpendRequirement)} → Get {formatReward(offer)}</h1>
      <p className="mt-2 text-lg font-medium">{offer.offerTitle}</p>
      {publicCard ? <p className="mt-2 text-sm font-semibold">{publicCard}</p> : null}
      {offer.offerDescription ? <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{offer.offerDescription}</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-muted/70 p-4"><p className="text-xs text-muted-foreground">Verified listings</p><p className="mt-2 font-semibold">{offer.activeListingCount}</p></div>
        <div className="rounded-2xl bg-secondary/70 p-4"><p className="text-xs text-primary/70">Lowest ask</p><p className="mt-2 font-semibold text-primary">{formatMoney(offer.lowestAsk)}</p></div>
        <div className="rounded-2xl bg-muted/70 p-4"><Star aria-hidden="true" className="size-4 fill-current text-[#b98224]" /><p className="mt-2 text-xs text-muted-foreground">Highest rating</p><p className="mt-1 font-semibold">{offer.highestRating.toFixed(1)}</p></div>
        <div className="rounded-2xl bg-muted/70 p-4"><CalendarDays aria-hidden="true" className="size-4 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Expires</p><p className="mt-1 font-semibold">{formatExpiration(offer.expirationDate)}</p></div>
      </div>
    </section>

    <section className="space-y-4">
      <div><h2 className="text-xl font-semibold">Available listings</h2><p className="mt-1 text-sm text-muted-foreground">Compare marketplace terms and reputation without revealing seller identity before unlock.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{listings.map((listing) => <ListingCard key={listing.listingId} listing={listing} />)}</div>
    </section>

    {totalPages > 1 ? <nav aria-label="Offer listing pages" className="flex items-center justify-center gap-3">
      {page > 1 ? <Link href={`/offers/${id}?page=${page - 1}`} className={buttonVariants({ variant: "outline" })}><ChevronLeft aria-hidden="true" /> Previous</Link> : null}
      <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
      {page < totalPages ? <Link href={`/offers/${id}?page=${page + 1}`} className={buttonVariants({ variant: "outline" })}>Next <ChevronRight aria-hidden="true" /></Link> : null}
    </nav> : null}
  </div>;
}
