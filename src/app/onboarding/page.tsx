import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { completeOnboardingAction } from "@/features/profiles/actions";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { getOwnProfile } from "@/features/profiles/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create your public profile",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getOwnProfile(supabase, user.id);
  if (profile?.onboardingCompleted) redirect("/search");

  return (
    <main className="paper-grid min-h-svh px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Brand className="mb-8" />
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </div>
          <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            One last step
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            Create your public identity
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Your public profile is pseudonymous. Your email and private account
            information are not shown to other users.
          </p>
          <div className="mt-8">
            <ProfileForm
              action={completeOnboardingAction}
              defaults={{
                username: profile?.username ?? "",
                avatarUrl: profile?.avatarUrl ?? "",
                bio: profile?.bio ?? "",
              }}
              submitLabel="Enter the marketplace"
            />
          </div>
        </section>
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          We will never ask for card credentials, a legal name, government ID, or a
          physical address during profile setup.
        </p>
      </div>
    </main>
  );
}
