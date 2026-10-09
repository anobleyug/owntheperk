import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { updateOfferListingAction } from "@/features/offers/actions";
import { OfferListingForm } from "@/features/offers/components/offer-listing-form";
import { getOfferListingFormOptions, getPrivateOfferListing } from "@/features/offers/data";
import { offerListingIdSchema } from "@/features/offers/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!offerListingIdSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [listing, options] = await Promise.all([
    getPrivateOfferListing(supabase, user.id, id),
    getOfferListingFormOptions(supabase, user.id),
  ]);
  if (!listing) notFound();
  if (listing.verificationStatus !== "DRAFT" && listing.verificationStatus !== "NEEDS_REVIEW") redirect(`/offers/manage/${id}`);
  const action = updateOfferListingAction.bind(null, id);

  return (
    <div className="space-y-8">
      <Link href={`/offers/manage/${id}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-4" /> Listing details</Link>
      <PageHeader eyebrow="Owner-only editing" title="Edit listing" description="Replace evidence or update marketplace terms while this listing remains editable." />
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <OfferListingForm action={action} cards={options.cards} merchants={options.merchants} offers={options.offers} listing={listing} />
      </section>
    </div>
  );
}
