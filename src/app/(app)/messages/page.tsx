import { MessageSquareText } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getConversations } from "@/features/messages/data";
import { formatMoney } from "@/features/marketplace/format";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const result = user ? await getConversations(supabase, user.id, page) : { conversations: [], total: 0, pageSize: 20 };
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Private conversations"
        title="Messages"
        description="Only conversation participants will be able to access message history."
      />
      {result.conversations.length === 0 ? <EmptyState
        icon={MessageSquareText}
        title="No conversations yet"
        description="Unlock chat from a verified listing to start a private conversation."
      /> : <div className="space-y-3">{result.conversations.map((conversation) => (
        <Link key={conversation.id} href={`/messages/${conversation.id}`} className="flex min-h-24 items-center justify-between gap-4 rounded-3xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 sm:p-5">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold tracking-[0.1em] text-primary uppercase">{conversation.merchantName}</p>
            <h2 className="mt-1 truncate font-semibold">{conversation.otherUsername}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ask {formatMoney(conversation.askAmount)}{conversation.isObo ? " OBO" : ""}</p>
          </div>
          {conversation.unreadCount > 0 && <span className="grid min-w-6 place-items-center rounded-full bg-primary px-1.5 py-1 text-xs font-bold text-primary-foreground" aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount}</span>}
        </Link>
      ))}</div>}
      {totalPages > 1 ? <nav aria-label="Conversation pages" className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" className={page <= 1 ? "pointer-events-none opacity-50" : ""}><Link href={`/messages?page=${page - 1}`}>Previous</Link></Button>
        <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
        <Button asChild variant="outline" className={page >= totalPages ? "pointer-events-none opacity-50" : ""}><Link href={`/messages?page=${page + 1}`}>Next</Link></Button>
      </nav> : null}
    </div>
  );
}
