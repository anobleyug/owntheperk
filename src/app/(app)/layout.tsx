import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getOwnProfile } from "@/features/profiles/data";
import { getUnreadNotificationCount } from "@/features/notifications/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile, accountResult, unreadNotificationCount] = await Promise.all([
    getOwnProfile(supabase, user.id),
    supabase.rpc("current_account_is_active"),
    getUnreadNotificationCount(supabase),
  ]);
  if (accountResult.data === false) redirect("/account-suspended");
  if (!profile?.onboardingCompleted) redirect("/onboarding");

  return (
    <AppShell username={profile.username ?? "Member"} avatarUrl={profile.avatarUrl} unreadNotificationCount={unreadNotificationCount}>
      {children}
    </AppShell>
  );
}
