import { BadgeCheck, CalendarDays, MessageCircle, Star, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getMarketplaceListing } from "@/features/marketplace/data";
import { formatExpiration, formatMoney, formatReward } from "@/features/marketplace/format";
import { offerListingIdSchema } from "@/features/offers/schema";
import { unlockChatAction } from "@/features/payments/actions";
import { MerchantFollowButton } from "@/features/notifications/components/merchant-follow-button";
import { isMerchantFollowed } from "@/features/notifications/data";
import { SafetyActions } from "@/features/trust/components/safety-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Verified offer listing" };

export default async function MarketplaceListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ unlock?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  if (!offerListingIdSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [listing, ownListingResult, conversationResult] = await Promise.all([
    getMarketplaceListing(supabase, id),
    user ? supabase.from("offer_listings").select("id").eq("id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("participant_conversations").select("id, status").eq("listing_id", id).eq("buyer_user_id", user.id).maybeSingle<{ id: string; status: string }>() : Promise.resolve({ data: null }),
  ]);
  if (!listing) notFound();
  const isOwner = Boolean(ownListingResult.data);
  const conversation = conversationResult.data;
  const unlocked = conversation && conversation.status !== "LOCKED";
  const merchantFollowed = user ? await isMerchantFollowed(supabase, user.id, listing.merchantId) : false;
  const checkoutAction = unlockChatAction.bind(null, id);

  return <div className="mx-auto max-w-4xl space-y-6">
    <Link href="/search" className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground hover:text-foreground">← Back to marketplace</Link>
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{listing.merchantName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">{formatReward(listing)}</h1>
          <p className="mt-2 text-lg font-medium">{listing.offerTitle}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{listing.offerDescription || "No additional credit card offer description."}</p>
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

    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-semibold">Save {listing.merchantName}</h2><p className="mt-1 text-sm text-muted-foreground">Get an in-app alert when another verified listing becomes available.</p></div>
      <MerchantFollowButton merchantId={listing.merchantId} merchantName={listing.merchantName} initiallyFollowing={merchantFollowed} />
    </section>

    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-brand-ink text-primary-foreground"><UserRound aria-hidden="true" className="size-5" /></span>
        <div><p className="font-semibold">Anonymous seller</p>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="size-3.5 fill-current text-[#b98224]" /> {listing.sellerRatingAverage.toFixed(1)} ({listing.sellerRatingCount})</span><span className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="size-3.5" /> {listing.sellerCompletedInteractionCount} interactions</span></p>
        </div>
      </div>
    </section>

    {!isOwner ? <SafetyActions offerListingId={listing.listingId} /> : null}

    <section className="sticky-mobile-action sticky z-20 rounded-3xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur lg:bottom-4">
      {isOwner ? <Button type="button" size="lg" className="w-full" disabled>Your Listing</Button>
        : unlocked ? <Button asChild size="lg" className="w-full"><Link href={`/messages/${conversation.id}`}>Open Conversation</Link></Button>
          : <form action={checkoutAction}><Button type="submit" size="lg" className="w-full">Unlock Chat — $1.99</Button></form>}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {isOwner ? "You cannot unlock chat on your own listing." : unlocked ? "Your private conversation is ready." : "One-time platform fee for access to this conversation."}
      </p>
      {query.unlock === "cancelled" && <p role="status" className="mt-2 text-center text-xs font-medium text-muted-foreground">Checkout was cancelled. You were not charged.</p>}
      {query.unlock === "unavailable" && <p role="alert" className="mt-2 text-center text-xs font-medium text-red-700">This listing is no longer available to unlock.</p>}
      {query.unlock === "error" && <p role="alert" className="mt-2 text-center text-xs font-medium text-red-700">Chat checkout could not be started. Please try again.</p>}
      {query.unlock === "rate_limited" && <p role="alert" className="mt-2 text-center text-xs font-medium text-red-700">Too many checkout attempts. Try again later.</p>}
    </section>
  </div>;
}
