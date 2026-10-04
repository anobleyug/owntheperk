import { LockKeyhole, MessageSquareText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function MessagesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Private conversations"
        title="Messages"
        description="Only conversation participants will be able to access message history."
      />
      <EmptyState
        icon={MessageSquareText}
        title="No conversations yet"
        description="Paid chat unlocks and Supabase Realtime messaging are intentionally deferred beyond this foundation phase."
        action={
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
            <LockKeyhole aria-hidden="true" className="size-4" />
            Participant-only access planned
          </span>
        }
      />
    </div>
  );
}
