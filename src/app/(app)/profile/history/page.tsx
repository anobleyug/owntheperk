import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  History,
  MessageSquareText,
  Tags,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { HistoryPagination } from "@/features/history/components/history-pagination";
import { getInteractionHistory } from "@/features/history/data";
import type { HistoryPages } from "@/features/history/types";
import { formatMoney } from "@/features/marketplace/format";
import { ProfileTabs } from "@/features/profiles/components/profile-tabs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Interaction history" };

type PageKey = keyof HistoryPages;
type HistorySearchParams = Partial<Record<`${PageKey}Page`, string>>;

function parsePage(value: string | undefined) {
  return Math.max(1, Number.parseInt(value ?? "1", 10) || 1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function labelStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function LedgerSection({
  children,
  count,
  empty,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  count: number;
  empty: string;
  icon: LucideIcon;
  title: string;
}) {
  return <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
        <h2 className="font-semibold sm:text-lg">{title}</h2>
      </div>
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        {count}
      </span>
    </div>
    {count ? <div className="mt-4 divide-y divide-border">{children}</div> : (
      <p className="mt-4 rounded-2xl bg-muted/55 px-4 py-5 text-sm text-muted-foreground">{empty}</p>
    )}
  </section>;
}

export default async function InteractionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<HistorySearchParams>;
}) {
  const query = await searchParams;
  const pages: HistoryPages = {
    active: parsePage(query.activePage),
    completed: parsePage(query.completedPage),
    closed: parsePage(query.closedPage),
    listings: parsePage(query.listingsPage),
    fees: parsePage(query.feesPage),
  };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const history = await getInteractionHistory(supabase, user.id, pages);
  const hrefFor = (key: PageKey, targetPage: number) => {
    const params = new URLSearchParams();
    for (const [pageKey, value] of Object.entries(pages) as Array<[PageKey, number]>) {
      if (pageKey === key ? targetPage > 1 : value > 1) {
        params.set(`${pageKey}Page`, String(pageKey === key ? targetPage : value));
      }
    }
    const search = params.toString();
    return search ? `/profile/history?${search}` : "/profile/history";
  };

  return <div className="space-y-8">
    <PageHeader
      eyebrow="Your marketplace profile"
      title="Interaction history"
      description="A private activity ledger of your conversations, listings, ratings, and platform fees."
    />
    <ProfileTabs active="history" />

    <div className="grid gap-5 lg:grid-cols-2">
      <LedgerSection icon={MessageSquareText} title="Active Conversations" count={history.active.total} empty="No active conversations.">
        {history.active.items.map((item) => <article key={item.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">{item.merchantName}</p>
              <h3 className="mt-1 truncate font-semibold">{item.offerTitle}</h3>
            </div>
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">{labelStatus(item.status)}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Min Spend {formatMoney(item.minSpend)} · Ask {formatMoney(item.askAmount)}{item.isObo ? " OBO" : ""}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <time className="text-xs text-muted-foreground" dateTime={item.date}>{formatDate(item.date)}</time>
            <Link href={`/messages/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>View Conversation</Link>
          </div>
        </article>)}
        <HistoryPagination label="Active conversations" {...history.active} hrefFor={(page) => hrefFor("active", page)} />
      </LedgerSection>

      <LedgerSection icon={CheckCircle2} title="Completed Interactions" count={history.completed.total} empty="No completed interactions yet.">
        {history.completed.items.map((item) => <article key={item.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">{item.merchantName}</p>
              <h3 className="mt-1 truncate font-semibold">{item.offerTitle}</h3>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.ratingStatus === "RATED" ? "bg-secondary text-primary" : "bg-[#fff5d9] text-[#79510b]"}`}>
              {item.ratingStatus === "RATED" ? "Rated" : "Rating available"}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Min Spend {formatMoney(item.minSpend)} · Ask {formatMoney(item.askAmount)}{item.isObo ? " OBO" : ""}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <time className="text-xs text-muted-foreground" dateTime={item.date}>{formatDate(item.date)}</time>
            <Link href={`/messages/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>View Conversation</Link>
          </div>
        </article>)}
        <HistoryPagination label="Completed interactions" {...history.completed} hrefFor={(page) => hrefFor("completed", page)} />
      </LedgerSection>

      <LedgerSection icon={Clock3} title="Closed / No Agreement" count={history.closed.total} empty="No closed interactions.">
        {history.closed.items.map((item) => <article key={item.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">{item.merchantName}</p>
              <h3 className="mt-1 truncate font-semibold">{item.offerTitle}</h3>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{labelStatus(item.status)}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Min Spend {formatMoney(item.minSpend)} · Ask {formatMoney(item.askAmount)}{item.isObo ? " OBO" : ""}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <time className="text-xs text-muted-foreground" dateTime={item.date}>{formatDate(item.date)}</time>
            <Link href={`/messages/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>View Conversation</Link>
          </div>
        </article>)}
        <HistoryPagination label="Closed interactions" {...history.closed} hrefFor={(page) => hrefFor("closed", page)} />
      </LedgerSection>

      <LedgerSection icon={Tags} title="Listings Posted" count={history.listings.total} empty="You have not posted any listings.">
        {history.listings.items.map((item) => <article key={item.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">{item.merchantName}</p>
              <h3 className="mt-1 truncate font-semibold">{item.offerTitle}</h3>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{labelStatus(item.listingStatus)}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Min Spend {formatMoney(item.minSpend)} · Ask {item.askAmount === null ? "Not set" : `${formatMoney(item.askAmount)}${item.isObo ? " OBO" : ""}`}</p>
          <p className="mt-1 text-xs text-muted-foreground">Verification: {labelStatus(item.verificationStatus)}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
            <Link href={`/offers/manage/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>View Listing</Link>
          </div>
        </article>)}
        <HistoryPagination label="Listings posted" {...history.listings} hrefFor={(page) => hrefFor("listings", page)} />
      </LedgerSection>

      <div className="lg:col-span-2">
        <LedgerSection icon={BadgeDollarSign} title="Platform Fees Paid" count={history.fees.total} empty="No completed platform fee payments.">
          <div className="grid md:grid-cols-2 md:gap-x-6">
            {history.fees.items.map((item) => {
              const feeLabel = item.paymentType === "LISTING_FEE" ? "Listing submission fee" : "Chat unlock fee";
              const feeAmount = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: item.currency.toUpperCase(),
              }).format(item.amount / 100);
              const targetHref = item.paymentType === "CHAT_UNLOCK" && item.conversationId
                ? `/messages/${item.conversationId}`
                : item.listingId ? `/offers/manage/${item.listingId}` : null;
              return <article key={item.id} className="py-4 first:pt-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">{item.paymentType}</p>
                    <h3 className="mt-1 font-semibold">{feeLabel}</h3>
                  </div>
                  <span className="shrink-0 text-lg font-semibold">{feeAmount}</span>
                </div>
                {(item.merchantName || item.offerTitle) && <p className="mt-2 truncate text-sm text-muted-foreground">{[item.merchantName, item.offerTitle].filter(Boolean).join(" · ")}</p>}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                  {targetHref && <Link href={targetHref} className={buttonVariants({ variant: "outline", size: "sm" })}>{item.paymentType === "CHAT_UNLOCK" ? "View Conversation" : "View Listing"}</Link>}
                </div>
              </article>;
            })}
          </div>
          <HistoryPagination label="Platform fees" {...history.fees} hrefFor={(page) => hrefFor("fees", page)} />
        </LedgerSection>
      </div>
    </div>

    <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
      <History aria-hidden="true" className="size-4 shrink-0" />
      History uses the original safe listing snapshot for conversations, so later listing edits do not change past interaction context.
    </p>
  </div>;
}

