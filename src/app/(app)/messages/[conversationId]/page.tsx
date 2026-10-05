import { BadgeCheck, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ConversationThread } from "@/features/messages/components/conversation-thread";
import { getConversation, getMessages } from "@/features/messages/data";
import { formatMoney, formatReward } from "@/features/marketplace/format";
import { createClient } from "@/lib/supabase/server";

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  if (!z.uuid().safeParse(conversationId).success) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const conversation = await getConversation(supabase, conversationId, user.id);
  if (!conversation) notFound();

  if (conversation.status === "LOCKED") {
    return <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/messages" className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground">← Messages</Link>
      <section className="rounded-3xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold">Payment is processing</h1>
        <p className="mt-2 text-sm text-muted-foreground">Stripe is confirming your chat unlock. Refresh this page in a moment.</p>
      </section>
    </div>;
  }

  const messages = await getMessages(supabase, conversationId);
  return <div className="mx-auto max-w-3xl space-y-4">
    <Link href="/messages" className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground">← Messages</Link>
    <header className="rounded-3xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">{conversation.merchantName}</p>
          <h1 className="mt-1 text-xl font-semibold">{formatReward(conversation)}</h1>
          <p className="mt-2 text-sm"><span className="text-muted-foreground">Ask:</span> {formatMoney(conversation.askAmount)}{conversation.isObo ? " OBO" : ""}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold"><span>{conversation.otherUsername}</span>{!conversation.isSeller && <><Star aria-hidden="true" className="size-3.5 fill-current text-[#b98224]" /> {conversation.sellerRatingAverage.toFixed(1)}</>}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary"><BadgeCheck aria-hidden="true" className="size-3.5" /> Verified</span>
      </div>
    </header>
    <ConversationThread conversationId={conversation.id} currentUserId={user.id} initialMessages={messages} />
  </div>;
}
