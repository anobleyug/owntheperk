"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, MessageCircleReply, ShieldCheck, Star, UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublicReputation } from "../client";

function ReputationSkeleton() {
  return <div className="space-y-6" role="status" aria-label="Loading reputation">
    <section className="rounded-3xl border border-border bg-card p-6"><Skeleton className="size-20" /><Skeleton className="mt-4 h-8 w-48" /><Skeleton className="mt-3 h-4 w-full max-w-md" /><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24" />)}</div></section>
    <section className="rounded-3xl border border-border bg-card p-6"><Skeleton className="h-6 w-32" /><Skeleton className="mt-5 h-24 w-full" /></section>
  </div>;
}

export function PublicReputation({ userId, page }: { userId: string; page: number }) {
  const reputationQuery = useQuery({
    queryKey: ["public-reputation", userId, page],
    queryFn: () => fetchPublicReputation(userId, page),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  if (reputationQuery.isPending) return <ReputationSkeleton />;
  if (reputationQuery.isError) return <section className="rounded-3xl border border-border bg-card p-6 text-center"><h1 className="font-semibold">Reputation unavailable</h1><p className="mt-2 text-sm text-muted-foreground">This member could not be found or their reputation could not be loaded.</p></section>;

  const { profile, reviews, total, pageSize } = reputationQuery.data;
  const memberSince = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(profile.createdAt));
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return <>
    <section className="overflow-hidden rounded-3xl border border-border bg-card" aria-busy={reputationQuery.isFetching}>
      <div className="h-24 bg-[linear-gradient(120deg,#c9e8db,#eadcae)]" />
      <div className="px-5 pb-6 sm:px-7">
        <div className="-mt-9 flex items-end justify-between gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-20 rounded-3xl border-4 border-card bg-muted object-cover" />
          ) : <span className="grid size-20 place-items-center rounded-3xl border-4 border-card bg-brand-ink text-primary-foreground"><UserRound aria-hidden="true" /></span>}
          {profile.phoneVerified && <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold"><ShieldCheck aria-hidden="true" className="size-3.5" /> Phone verified</span>}
        </div>
        <h1 className="mt-4 text-2xl font-semibold">{profile.username}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{profile.bio || "Marketplace member"}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-muted/70 p-3"><Star aria-hidden="true" className="size-4 text-primary" /><p className="mt-3 font-semibold">{profile.ratingCount ? profile.ratingAverage.toFixed(1) : "—"}</p><p className="text-xs text-muted-foreground">{profile.ratingCount} reviews</p></div>
          <div className="rounded-2xl bg-muted/70 p-3"><MessageCircleReply aria-hidden="true" className="size-4 text-primary" /><p className="mt-3 font-semibold">{profile.completedInteractionCount}</p><p className="text-xs text-muted-foreground">Completed</p></div>
          <div className="rounded-2xl bg-muted/70 p-3"><BadgeCheck aria-hidden="true" className="size-4 text-primary" /><p className="mt-3 font-semibold">{profile.optionalIdentityVerified ? "Yes" : "Not added"}</p><p className="text-xs text-muted-foreground">Identity check</p></div>
          <div className="rounded-2xl bg-muted/70 p-3"><CalendarDays aria-hidden="true" className="size-4 text-primary" /><p className="mt-3 font-semibold">{memberSince}</p><p className="text-xs text-muted-foreground">Member since</p></div>
        </div>
      </div>
    </section>

    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="flex items-center gap-3"><h2 className="text-lg font-semibold">Reviews <span className="text-sm font-normal text-muted-foreground">({total})</span></h2>{reputationQuery.isFetching ? <span className="text-xs text-muted-foreground">Refreshing…</span> : null}</div>
      {reviews.length ? <div className="mt-4 divide-y divide-border">{reviews.map((review) => <article key={review.id} className="py-4 first:pt-0 last:pb-0">
        <div className="flex items-center justify-between gap-3"><p className="font-semibold">{review.reviewerUsername}</p><span className="inline-flex items-center gap-1 text-sm"><Star aria-hidden="true" className="size-3.5 fill-current text-[#b98224]" /> {review.overallScore}</span></div>
        {review.reviewText && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{review.reviewText}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(review.createdAt))}</p>
      </article>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No reviews yet.</p>}
      {pages > 1 && <div className="mt-5 flex items-center justify-between"><Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-50" : ""}><Link href={`/users/${userId}?page=${page - 1}`}>Previous</Link></Button><span className="text-xs text-muted-foreground">Page {page} of {pages}</span><Button asChild variant="outline" size="sm" className={page >= pages ? "pointer-events-none opacity-50" : ""}><Link href={`/users/${userId}?page=${page + 1}`}>Next</Link></Button></div>}
    </section>
  </>;
}
