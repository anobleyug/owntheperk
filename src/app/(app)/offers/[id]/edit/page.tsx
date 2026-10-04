import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { updateOfferAction } from "@/features/offers/actions";
import { OfferForm } from "@/features/offers/components/offer-form";
import { getOfferFormOptions, getPrivateOffer } from "@/features/offers/data";
import { offerIdSchema } from "@/features/offers/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit offer" };

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!offerIdSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [offer, options] = await Promise.all([
    getPrivateOffer(supabase, user.id, id),
    getOfferFormOptions(supabase, user.id),
  ]);
  if (!offer) notFound();
  if (offer.verificationStatus !== "DRAFT" && offer.verificationStatus !== "NEEDS_REVIEW") redirect(`/offers/${id}`);
  const action = updateOfferAction.bind(null, id);

  return (
    <div className="space-y-8">
      <Link href={`/offers/${id}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-4" /> Offer details</Link>
      <PageHeader eyebrow="Owner-only editing" title="Edit offer" description="Replace evidence or update terms while this offer remains editable." />
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <OfferForm action={action} cards={options.cards} merchants={options.merchants} offer={offer} />
      </section>
    </div>
  );
}
