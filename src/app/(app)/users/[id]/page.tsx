import { BadgeCheck, CalendarDays, MessageCircleReply, ShieldCheck, Star, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { getPublicProfile } from "@/features/profiles/data";
import { SafetyActions } from "@/features/trust/components/safety-actions";
import { getPublicReviews, REVIEWS_PAGE_SIZE, hasBlockedUser } from "@/features/trust/data";
import { createClient } from "@/lib/supabase/server";

export default async function PublicProfilePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const [profile, reviewResult, blocked] = await Promise.all([
    getPublicProfile(supabase, id),
    getPublicReviews(supabase, id, page),
    user.id === id ? Promise.resolve(false) : hasBlockedUser(supabase, user.id, id),
  ]);
  if (!profile?.username) notFound();
  const memberSince = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(profile.createdAt));
  const pages = Math.max(1, Math.ceil(reviewResult.total / REVIEWS_PAGE_SIZE));

  return <div className="mx-auto max-w-3xl space-y-6">
    <Link href="/search" className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground">← Marketplace</Link>
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
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
      <h2 className="text-lg font-semibold">Reviews <span className="text-sm font-normal text-muted-foreground">({reviewResult.total})</span></h2>
      {reviewResult.reviews.length ? <div className="mt-4 divide-y divide-border">{reviewResult.reviews.map((review) => <article key={review.id} className="py-4 first:pt-0 last:pb-0">
        <div className="flex items-center justify-between gap-3"><p className="font-semibold">{review.reviewerUsername}</p><span className="inline-flex items-center gap-1 text-sm"><Star aria-hidden="true" className="size-3.5 fill-current text-[#b98224]" /> {review.overallScore}</span></div>
        {review.reviewText && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{review.reviewText}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(review.createdAt))}</p>
      </article>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No reviews yet.</p>}
      {pages > 1 && <div className="mt-5 flex items-center justify-between"><Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-50" : ""}><Link href={`/users/${id}?page=${page - 1}`}>Previous</Link></Button><span className="text-xs text-muted-foreground">Page {page} of {pages}</span><Button asChild variant="outline" size="sm" className={page >= pages ? "pointer-events-none opacity-50" : ""}><Link href={`/users/${id}?page=${page + 1}`}>Next</Link></Button></div>}
    </section>
    {user.id !== id && <SafetyActions targetUserId={id} initiallyBlocked={blocked} />}
  </div>;
}
