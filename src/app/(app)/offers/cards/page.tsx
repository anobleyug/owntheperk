import { ArrowLeft, CreditCard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { AddCardForm, CardList } from "@/features/cards/components/card-manager";
import { getPrivateCards } from "@/features/cards/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Private cards" };

export default async function CardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const cards = await getPrivateCards(supabase, user.id);

  return (
    <div className="space-y-8">
      <Link href="/offers" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" /> My offers
      </Link>
      <PageHeader
        eyebrow="Owner-only organization"
        title="My private cards"
        description="Use nicknames to organize offers. Card profiles, types, and optional last four digits are never exposed in marketplace data."
      />

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Add a card profile</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">This is an organizational record—not a payment method.</p>
        <div className="mt-6"><AddCardForm /></div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Saved cards</h2>
          <p className="mt-1 text-sm text-muted-foreground">Inactive cards remain available for historical offer records.</p>
        </div>
        {cards.length ? (
          <CardList cards={cards} />
        ) : (
          <EmptyState icon={CreditCard} title="No private cards yet" description="Add a private card nickname above before creating your first offer." />
        )}
      </section>
    </div>
  );
}
