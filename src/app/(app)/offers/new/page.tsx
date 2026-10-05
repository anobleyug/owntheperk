import { ArrowLeft, CreditCard, FileLock2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { createOfferListingAction } from "@/features/offers/actions";
import { OfferListingForm } from "@/features/offers/components/offer-listing-form";
import { getOfferListingFormOptions } from "@/features/offers/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add listing" };

export default async function NewOfferPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { cards, merchants, offers } = await getOfferListingFormOptions(supabase, user.id);

  return (
    <div className="space-y-8">
      <Link href="/offers" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" /> My offers
      </Link>
      <PageHeader
        eyebrow="Private listing setup"
        title="Add a listing"
        description="Save a draft at any time. Submission requires private evidence and always enters pending verification."
      />

      {!cards.length ? (
        <section className="rounded-3xl border border-border bg-card p-6 text-center sm:p-8">
          <CreditCard aria-hidden="true" className="mx-auto size-8 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Add an active card first</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Listings must belong to one of your private card profiles.</p>
          <Link href="/offers/cards" className={buttonVariants({ className: "mt-5" })}>Manage private cards</Link>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
            <OfferListingForm action={createOfferListingAction} cards={cards} merchants={merchants} offers={offers} />
          </section>
          <aside className="h-fit rounded-3xl bg-brand-ink p-6 text-primary-foreground">
            <FileLock2 aria-hidden="true" className="size-6 text-[#a8d8cb]" />
            <h2 className="mt-5 text-lg font-semibold">Evidence stays private</h2>
            <p className="mt-2 text-sm leading-6 text-white/75">Files use opaque storage paths in a non-public bucket. Other marketplace users cannot access them.</p>
            <p className="mt-5 text-xs leading-5 text-white/60">Never upload full card numbers, CVV, PIN, passwords, or issuer login screens containing credentials.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
