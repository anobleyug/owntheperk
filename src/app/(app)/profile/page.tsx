import {
  BadgeCheck,
  CalendarDays,
  LogOut,
  MessageCircleReply,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { updateProfileAction } from "@/features/profiles/actions";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { getOwnProfile } from "@/features/profiles/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

function initialsFor(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOwnProfile(supabase, user.id);
  if (!profile?.onboardingCompleted || !profile.username) redirect("/onboarding");

  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(profile.createdAt));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pseudonymous identity"
        title="Your profile"
        description="Manage the public identity and reputation placeholders other marketplace members can see."
      />

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="h-24 bg-[linear-gradient(120deg,#c9e8db,#eadcae)]" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-9 flex items-end justify-between gap-4">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={`${profile.username}'s avatar`}
                referrerPolicy="no-referrer"
                className="size-20 rounded-3xl border-4 border-card bg-muted object-cover"
              />
            ) : (
              <span className="grid size-20 place-items-center rounded-3xl border-4 border-card bg-brand-ink text-xl font-bold text-primary-foreground">
                {initialsFor(profile.username)}
              </span>
            )}
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              {profile.phoneVerified ? "Phone verified" : "Phone not verified"}
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.035em]">
            {profile.username}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.bio || "No public bio yet."}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                icon: Star,
                value: profile.ratingCount ? profile.ratingAverage.toFixed(1) : "—",
                label: "Rating",
              },
              {
                icon: MessageCircleReply,
                value: String(profile.completedInteractionCount),
                label: "Interactions",
              },
              {
                icon: BadgeCheck,
                value: profile.optionalIdentityVerified ? "Yes" : "No",
                label: "Identity verified",
              },
              { icon: CalendarDays, value: memberSince, label: "Member since" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl bg-muted/75 p-3.5">
                <Icon aria-hidden="true" className="size-4 text-primary" />
                <p className="mt-4 text-lg font-semibold">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Edit public profile</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Only these fields are editable. Trust, verification, and reputation fields are
          protected by database permissions and Row Level Security.
        </p>
        <div className="mt-6 max-w-2xl">
          <ProfileForm
            action={updateProfileAction}
            defaults={{
              username: profile.username,
              avatarUrl: profile.avatarUrl ?? "",
              bio: profile.bio ?? "",
            }}
            submitLabel="Save profile"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-semibold">Private account data</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your email and authentication details stay in Supabase Auth and are never
            included in the marketplace profile DTO.
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            <LogOut aria-hidden="true" />
            Log out
          </Button>
        </form>
      </section>
    </div>
  );
}
