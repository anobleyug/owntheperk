import { BadgeCheck, CalendarDays, MessageCircle, Star, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getMarketplaceListing } from "@/features/marketplace/data";
import { formatExpiration, formatMoney, formatReward } from "@/features/marketplace/format";
import { offerListingIdSchema } from "@/features/offers/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Verified offer listing" };

export default async function MarketplaceListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!offerListingIdSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const listing = await getMarketplaceListing(supabase, id);
  if (!listing) notFound();

  return <div className="mx-auto max-w-4xl space-y-6">
    <Link href="/search" className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground hover:text-foreground">← Back to marketplace</Link>
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{listing.merchantName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">{formatReward(listing)}</h1>
          <p className="mt-2 text-lg font-medium">{listing.offerTitle}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{listing.offerDescription || "No additional canonical offer description."}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary"><BadgeCheck aria-hidden="true" className="size-4" /> Offer verified</span>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-muted/70 p-4"><p className="text-xs text-muted-foreground">Min spend</p><p className="mt-2 font-semibold">{formatMoney(listing.minSpend)}</p></div>
        <div className="rounded-2xl bg-secondary/70 p-4"><p className="text-xs text-primary/70">Ask</p><p className="mt-2 font-semibold text-primary">{formatMoney(listing.askAmount)}{listing.isObo ? " OBO" : ""}</p><p className="mt-1 text-xs text-primary/70">{listing.isObo ? "Negotiable" : "Fixed ask"}</p></div>
        <div className="rounded-2xl bg-muted/70 p-4"><p className="text-xs text-muted-foreground">Canonical spend</p><p className="mt-2 font-semibold">{formatMoney(listing.canonicalSpendRequirement)}</p></div>
        <div className="rounded-2xl bg-muted/70 p-4"><CalendarDays aria-hidden="true" className="size-4 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Expires</p><p className="mt-1 font-semibold">{formatExpiration(listing.expirationDate)}</p></div>
      </div>
    </section>

    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="flex items-center gap-3">
        {listing.sellerAvatarUrl ? (
          // User-configured HTTPS avatars are intentionally rendered without a host allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.sellerAvatarUrl} alt="" className="size-12 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : <span className="grid size-12 place-items-center rounded-full bg-brand-ink text-primary-foreground"><UserRound aria-hidden="true" className="size-5" /></span>}
        <div><h2 className="font-semibold">{listing.sellerUsername}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="size-3.5 fill-current text-[#b98224]" /> {listing.sellerRatingAverage.toFixed(1)} ({listing.sellerRatingCount})</span><span className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="size-3.5" /> {listing.sellerCompletedInteractionCount} interactions</span></p>
        </div>
      </div>
    </section>

    <section className="sticky bottom-20 rounded-3xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur lg:bottom-4">
      <Button type="button" size="lg" className="w-full" disabled>Unlock Chat — $1.99</Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">Chat unlock is coming in the next payment phase. No payment is collected yet.</p>
    </section>
  </div>;
}
