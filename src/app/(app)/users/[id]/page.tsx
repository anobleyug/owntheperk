import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PublicReputation } from "@/features/marketplace/components/public-reputation";
import { SafetyActions } from "@/features/trust/components/safety-actions";
import { hasBlockedUser } from "@/features/trust/data";
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
  const blocked = user.id === id ? false : await hasBlockedUser(supabase, user.id, id);

  return <div className="mx-auto max-w-3xl space-y-6">
    <Link href="/search" className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground">← Marketplace</Link>
    <PublicReputation userId={id} page={page} />
    {user.id !== id && <SafetyActions targetUserId={id} initiallyBlocked={blocked} />}
  </div>;
}
