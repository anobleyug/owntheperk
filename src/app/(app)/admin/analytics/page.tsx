import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  CircleCheckBig,
  ClipboardClock,
  Flag,
  ListChecks,
  MessageCircleMore,
  Repeat2,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { canCurrentUserModerate } from "@/features/admin/auth";
import { getAdminAnalytics } from "@/features/admin/data";
import type { MerchantAnalyticsDTO } from "@/features/admin/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Marketplace analytics" };

const integer = new Intl.NumberFormat("en-US");
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function MetricCard({ label, value, detail, icon: Icon }: {
  label: string;
  value: string;
  detail: string;
  icon: typeof UsersRound;
}) {
  return <article className="rounded-3xl border border-border bg-card p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><Icon aria-hidden="true" className="size-4.5" /></span>
    </div>
    <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
    <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
  </article>;
}

function MerchantRanking({ title, description, rows }: {
  title: string;
  description: string;
  rows: MerchantAnalyticsDTO[];
}) {
  return <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
    <h2 className="font-semibold">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    {rows.length ? <ol className="mt-5 divide-y divide-border">
      {rows.map((row, index) => <li key={row.merchantId} className="flex min-h-12 items-center gap-3 py-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{index + 1}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.merchantName}</span>
        <span className="text-sm font-semibold tabular-nums">{integer.format(row.count)}</span>
      </li>)}
    </ol> : <p className="mt-5 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">No data yet.</p>}
  </section>;
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await canCurrentUserModerate(supabase, user.id))) notFound();

  const analytics = await getAdminAnalytics(supabase);
  const metrics = [
    { label: "Total users", value: integer.format(analytics.totalUsers), detail: "All registered profile records.", icon: UsersRound },
    { label: "Active users", value: integer.format(analytics.activeUsers), detail: "Onboarded accounts in active standing.", icon: UserRoundCheck },
    { label: "Active verified listings", value: integer.format(analytics.activeVerifiedListings), detail: "Listings currently visible in the marketplace.", icon: ListChecks },
    { label: "Pending verifications", value: integer.format(analytics.pendingVerifications), detail: "Submitted listings waiting for review.", icon: ClipboardClock },
    { label: "Completed interactions", value: integer.format(analytics.completedInteractions), detail: "Conversations marked completed by a participant.", icon: CircleCheckBig },
    { label: "Chat unlocks", value: integer.format(analytics.chatUnlockCount), detail: "Conversations unlocked by a successful $1.99 fee.", icon: MessageCircleMore },
    { label: "Platform revenue", value: usd.format(analytics.platformRevenueCents / 100), detail: "Successful USD listing and chat platform fees.", icon: BadgeDollarSign },
    { label: "Open reports", value: integer.format(analytics.openReports), detail: "Reports not yet moved into review.", icon: Flag },
    { label: "Listing → chat unlock", value: `${analytics.listingToChatConversion.toFixed(1)}%`, detail: "Share of all listings with at least one paid chat unlock.", icon: ChartNoAxesCombined },
    { label: "Repeat buyers", value: integer.format(analytics.repeatBuyerCount), detail: "Buyers with at least two successful chat unlocks.", icon: Repeat2 },
  ];

  return <div className="space-y-8">
    <PageHeader eyebrow="Admin · aggregate data" title="Marketplace analytics" description="Operational marketplace metrics without private messages, card data, verification evidence, or personal contact information." />
    <section aria-label="Marketplace metrics" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
    </section>
    <div className="grid gap-4 lg:grid-cols-2">
      <MerchantRanking title="Top merchants by listings" description="Current active, verified marketplace listings." rows={analytics.topMerchantsByListings} />
      <MerchantRanking title="Top merchants by searches" description="Sanitized searches that exactly matched a merchant." rows={analytics.topMerchantsBySearches} />
    </div>
  </div>;
}
