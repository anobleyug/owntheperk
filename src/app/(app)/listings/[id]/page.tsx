import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PublicListingDetails } from "@/features/marketplace/components/public-listing-details";
import { getMarketplaceListing } from "@/features/marketplace/data";
import { offerListingIdSchema } from "@/features/offers/schema";
import { unlockChatAction } from "@/features/payments/actions";
import { MerchantFollowButton } from "@/features/notifications/components/merchant-follow-button";
import { isMerchantFollowed } from "@/features/notifications/data";
import { isOfferSaved } from "@/features/saved-offers/data";
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
  const [merchantFollowed, offerSaved] = user ? await Promise.all([
    isMerchantFollowed(supabase, user.id, listing.merchantId),
    isOfferSaved(supabase, user.id, listing.offerId),
  ]) : [false, false];
  const checkoutAction = unlockChatAction.bind(null, id);

  return <div className="mx-auto max-w-4xl space-y-6">
    <Link href="/search" className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground hover:text-foreground">← Back to marketplace</Link>
    <PublicListingDetails initialListing={listing} initiallySaved={offerSaved} />

    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-semibold">Save {listing.merchantName}</h2><p className="mt-1 text-sm text-muted-foreground">Get an in-app alert when another verified listing becomes available.</p></div>
      <MerchantFollowButton merchantId={listing.merchantId} merchantName={listing.merchantName} initiallyFollowing={merchantFollowed} />
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
