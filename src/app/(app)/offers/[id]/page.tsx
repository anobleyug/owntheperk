import { ArrowLeft, CalendarDays, CreditCard, FileLock2, Pencil, Send, WalletCards } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { submitOfferListingAction } from "@/features/offers/actions";
import { StatusBadge } from "@/features/offers/components/status-badge";
import { getPrivateOfferListing } from "@/features/offers/data";
import { offerListingIdSchema } from "@/features/offers/schema";
import { payListingSubmissionFeeAction } from "@/features/payments/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Listing details" };

export default async function OfferListingDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submission?: string; listingFee?: string }>;
}) {
  const { id } = await params;
  if (!offerListingIdSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const listing = await getPrivateOfferListing(supabase, user.id, id);
  if (!listing) notFound();
  const { submission, listingFee } = await searchParams;
  const editable = listing.verificationStatus === "DRAFT" || listing.verificationStatus === "NEEDS_REVIEW";
  const submit = submitOfferListingAction.bind(null, listing.id);
  const payListingFee = payListingSubmissionFeeAction.bind(null, listing.id);

  return <div className="space-y-8">
    <Link href="/offers" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-4" /> My offers</Link>
    {submission === "success" ? <p className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">Listing submitted for verification.</p> : null}
    {submission === "error" ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">Submission failed. Confirm the credit card offer is current, the listing has an ask, and private evidence exists.</p> : null}
    {listingFee === "required" ? <p role="status" className="rounded-2xl bg-[#fff5d9] p-4 text-sm text-[#79510b]">Your draft and evidence are saved. Pay the one-time $0.99 listing fee to submit it for verification.</p> : null}
    {listingFee === "success" || listingFee === "processing" ? <p role="status" className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">Payment received. Stripe is confirming your listing submission; refresh shortly if the status is still Draft.</p> : null}
    {listingFee === "paid" ? <p role="status" className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">The listing fee is already paid. This draft can be submitted without another charge.</p> : null}
    {listingFee === "cancelled" ? <p role="status" className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Checkout was cancelled. You were not charged and your listing remains a draft.</p> : null}
    {listingFee === "incomplete" ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">Add an asking amount and private evidence before paying the listing fee.</p> : null}
    {listingFee === "error" || listingFee === "unavailable" ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">Listing checkout could not be started. Refresh and try again.</p> : null}
    {listingFee === "rate_limited" ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">Too many checkout attempts. Try again later.</p> : null}

    <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{listing.merchantName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">{listing.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{listing.description || "No additional description."}</p>
        </div>
        <div className="flex flex-wrap gap-2"><StatusBadge status={listing.verificationStatus} /><StatusBadge status={listing.listingStatus} /></div>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-muted/70 p-4"><p className="text-xs text-muted-foreground">Min spend</p><p className="mt-2 font-semibold">USD {listing.minSpend.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">Canonical: USD {listing.requiredSpend.toLocaleString()}</p></div>
        <div className="rounded-2xl bg-muted/70 p-4"><p className="text-xs text-muted-foreground">Ask</p><p className="mt-2 font-semibold">{listing.askAmount === null ? "Not set" : "$" + listing.askAmount.toLocaleString() + (listing.isObo ? " OBO" : "")}</p><p className="mt-1 text-xs text-muted-foreground">Reward: {listing.rewardAmount.toLocaleString()} · {listing.rewardType.replaceAll("_", " ").toLowerCase()}</p></div>
        <div className="rounded-2xl bg-muted/70 p-4"><CalendarDays aria-hidden="true" className="size-4 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Expires</p><p className="mt-1 font-semibold">{listing.expirationDate}</p></div>
        <div className="rounded-2xl bg-muted/70 p-4"><CreditCard aria-hidden="true" className="size-4 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Private card</p><p className="mt-1 font-semibold">{listing.cardNickname}</p></div>
      </div>
    </section>

    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="flex items-start gap-3"><FileLock2 aria-hidden="true" className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold">Private listing evidence</h2><p className="mt-1 text-sm text-muted-foreground">{listing.evidence ? "Evidence status: " + listing.evidence.status.toLowerCase().replaceAll("_", " ") + "." : "No evidence uploaded."}</p></div></div>
      {listing.evidence ? <Link href={"/offers/" + listing.id + "/evidence"} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", className: "mt-5" })}>View my evidence</Link> : null}
    </section>
    <section className="flex items-start gap-3 rounded-3xl border border-border bg-card p-5 sm:p-7">
      <WalletCards aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <h2 className="font-semibold">Listing submission fee</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {listing.listingFeeStatus === "SUCCEEDED" ? "Paid — this listing will not be charged again." : listing.listingFeeStatus === "PENDING" ? "Checkout started — $0.99 due before verification." : "$0.99 due once before this listing can enter verification."}
        </p>
      </div>
    </section>
    <div className="flex flex-col gap-3 sm:flex-row">
      {editable ? <Link href={"/offers/" + listing.id + "/edit"} className={buttonVariants({ variant: "outline", size: "lg" })}><Pencil aria-hidden="true" /> Edit listing</Link> : null}
      {editable && listing.listingFeeStatus === "SUCCEEDED" ? <form action={submit}><Button type="submit" size="lg" disabled={!listing.evidence || listing.askAmount === null}><Send aria-hidden="true" /> Submit for verification</Button></form> : null}
      {editable && listing.listingFeeStatus !== "SUCCEEDED" ? <form action={payListingFee}><Button type="submit" size="lg" disabled={!listing.evidence || listing.askAmount === null}><WalletCards aria-hidden="true" /> Pay $0.99 &amp; submit</Button></form> : null}
    </div>
  </div>;
}
