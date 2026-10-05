import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { isCurrentUserAdmin } from "@/features/admin/auth";
import { VerificationCard } from "@/features/admin/components/verification-card";
import { getPendingVerifications } from "@/features/admin/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Offer verification" };

export default async function AdminVerificationsPage({ searchParams }: {
  searchParams: Promise<{ review?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin(supabase, user.id))) notFound();
  const [verifications, query] = await Promise.all([getPendingVerifications(supabase), searchParams]);

  return <div className="space-y-8">
    <PageHeader eyebrow="Admin · private evidence" title="Offer-listing verification" description="Compare each cardholder's private evidence with the referenced canonical offer before publishing." />
    {query.review === "success" ? <p className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">Review decision saved.</p> : null}
    {query.review === "error" ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">The review could not be completed. Refresh and confirm the listing is still pending.</p> : null}
    {verifications.length ? <div className="space-y-5">{verifications.map((verification) => <VerificationCard key={verification.listingId} verification={verification} />)}</div> :
      <EmptyState icon={ClipboardCheck} title="Verification queue is clear" description="Submitted listings awaiting review will appear here." />}
  </div>;
}
